import { BadRequestException, Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { Campaign } from "./entities/campaign.entity";
import { DataSource, In, Repository } from "typeorm";
import { NotificationService } from "../notifications/notification.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TransactionService } from "src/transactions/transaction.service";
import { Transactions } from "src/transactions/entities/transaction.entity";
import { MinioService } from "src/minio/minio.service";
import { AdCreative } from "src/ad-creatives/entities/ad-creative.entity";
import { AdSet } from "src/ad-sets/entities/ad-sets.entity";
import { Ad } from "src/ads/entities/ad.entity";
import { AdvertiserService } from "src/advertisers/advertiser.service";
import { DEFAULT_PAYMENT_METHOD } from "src/transactions/payment";

// Budget and schedule together set the amount paid, so they're editable only while draft.
const BUDGET_FIELDS = ['budgetPlan', 'dailyBudget', 'totalBudget', 'startDate', 'endDate'] as const;

type BudgetShape = Pick<Campaign, 'budgetPlan' | 'dailyBudget' | 'totalBudget' | 'startDate' | 'endDate'>;

/**
 * Validates a campaign's budget and makes the server the owner of the amount paid:
 * a daily plan's total is daily × days (inclusive), a total plan has no daily amount.
 */
function normalizeBudget(budget: BudgetShape): void {
    const start = new Date(budget.startDate).getTime();
    const end = new Date(budget.endDate).getTime();
    if (isNaN(start) || isNaN(end)) {
        throw new BadRequestException('Start and end dates are required');
    }
    if (end < start) {
        throw new BadRequestException('End date must be on or after the start date');
    }
    budget.budgetPlan = budget.budgetPlan === 'total' ? 'total' : 'daily';
    if (budget.budgetPlan === 'daily') {
        const dailyBudget = Number(budget.dailyBudget);
        if (!(dailyBudget >= 1)) {
            throw new BadRequestException('Daily budget must be at least 1');
        }
        const days = Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
        budget.dailyBudget = dailyBudget;
        budget.totalBudget = dailyBudget * days;
    } else {
        budget.dailyBudget = 0;
        budget.totalBudget = Number(budget.totalBudget);
    }
    if (!(budget.totalBudget >= 1)) {
        throw new BadRequestException('Total budget must be at least 1');
    }
}

export interface CreateFullCampaignInput {
    advertiserId: string;
    name: string;
    budgetPlan: string;
    dailyBudget: number;
    totalBudget: number;
    startDate: Date;
    endDate: Date;
    creativeName: string;
    assetType: string;
    destinationLink: string;
    ageMin: number;
    ageMax: number;
    gender: string;
    adType: string;
    placementKey: string;
}

@Injectable()
export class CampaignService {
    constructor (
        @InjectRepository(Campaign)
        private campaignRepository: Repository<Campaign>,
        @InjectRepository(Ad)
        private adRepository: Repository<Ad>,
        private readonly notificationService: NotificationService,
        private readonly transactionService: TransactionService,
        private readonly minioService: MinioService,
        private readonly advertiserService: AdvertiserService,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
        try {
            // Drop relation/id keys an unwhitelisted body could carry; the owner is campaignData.advertiserId, already resolved.
            const { id: _id, advertiser: _advertiser, ...safeData } = campaignData;
            const campaign = await this.campaignRepository.create(safeData);
            normalizeBudget(campaign);
            return await this.campaignRepository.save(campaign);
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new NotAcceptableException(error.message);
        }
    }

    async findCampaignList(advertiserIds?: string[]): Promise<(Campaign & { transaction: Transactions | null })[]> {
        try {
            if (advertiserIds && advertiserIds.length === 0) return [];
            const campaigns = await this.campaignRepository.find({
                where: advertiserIds ? { advertiserId: In(advertiserIds) } : {},
                relations: { advertiser: true },
                select: { advertiser: { id: true, name: true } },
            });
            if (campaigns.length === 0) return [];
            const campaignIds = campaigns.map(c => c.id);
            const transactions = await this.transactionService.findByReferenceIds(campaignIds, 'campaign');
            const transactionMap = new Map(transactions.map(t => [t.referenceId, t]));
            return campaigns.map(campaign =>
                Object.assign(campaign, { transaction: transactionMap.get(campaign.id) ?? null })
            );
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findCampaignById(id: string): Promise<Campaign & { transaction: Transactions | null }> {
        try {
            const campaign = await this.campaignRepository.findOneBy({ id });
            if(!campaign) {
                throw new Error ("Campaign not found");
            }
            const transaction = await this.transactionService.findByReferenceId(id, 'campaign');
            return Object.assign(campaign, { transaction });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async updateCampaign(id: string, updateData: Partial<Campaign>): Promise<Campaign> {
        try {
            // Same row lock as payCampaign: a budget save and a payment can't interleave,
            // so a paid campaign is never written back to draft or re-priced.
            return await this.dataSource.transaction(async (manager) => {
                const campaign = await manager.findOne(Campaign, { where: { id }, lock: { mode: 'pessimistic_write' } });
                if (!campaign) {
                    throw new BadRequestException('Campaign not found');
                }
                // Only the name and budget/schedule are editable here. Status, owner and payment
                // never change through this endpoint (status leaves draft only via payCampaign).
                const editable: Partial<Campaign> = {};
                if (updateData.name !== undefined) editable.name = updateData.name;
                for (const key of BUDGET_FIELDS) {
                    if (updateData[key] !== undefined) (editable as any)[key] = updateData[key];
                }
                const touchesBudget = BUDGET_FIELDS.some((key) => editable[key] !== undefined);
                if (touchesBudget && campaign.status !== 'draft') {
                    throw new BadRequestException('Budget can only be changed while the ad is a draft');
                }

                Object.assign(campaign, editable);
                if (touchesBudget) {
                    normalizeBudget(campaign);
                }
                return await manager.save(campaign);
            });
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new NotAcceptableException(error.message);
        }
    }

    /** Records the (KBZPay) payment for a draft campaign and releases it: active for admins, pending review otherwise. */
    async payCampaign(id: string, role: string): Promise<Campaign> {
        const nextStatus = role === 'admin' ? 'active' : 'pending';
        const paid = await this.dataSource.transaction(async (manager) => {
            // Row lock so two quick "Pay" clicks can't both record a payment.
            const campaign = await manager.findOne(Campaign, { where: { id }, lock: { mode: 'pessimistic_write' } });
            if (!campaign) {
                throw new BadRequestException('Campaign not found');
            }
            if (campaign.status !== 'draft') {
                throw new BadRequestException('Only a draft ad can be paid');
            }
            if (!(Number(campaign.totalBudget) >= 1)) {
                throw new BadRequestException('This ad has no budget to pay for');
            }

            const payerId = await this.advertiserService.resolvePayerId(campaign.advertiserId);
            await manager.save(manager.create(Transactions, {
                advertiserId: payerId,
                paymentMethod: DEFAULT_PAYMENT_METHOD,
                amount: campaign.totalBudget,
                referenceType: 'campaign',
                referenceId: campaign.id,
            }));

            campaign.status = nextStatus;
            await manager.save(campaign);
            await manager
                .createQueryBuilder()
                .update(Ad)
                .set({ status: nextStatus })
                .where('status = :draft', { draft: 'draft' })
                .andWhere('ad_set_id IN (SELECT id FROM ad_sets WHERE campaign_id = :campaignId)', { campaignId: campaign.id })
                .execute();
            return campaign;
        });

        await this.notificationService.createNotification({
            advertiserId: paid.advertiserId,
            title: "Notification about Payment",
            message: nextStatus === 'active'
                ? `Payment received. Your Ad is now active !`
                : `Payment received. Your Ad has been submitted for review !`,
        });
        return paid;
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async expireCampaigns() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const expiredCampaigns = await this.campaignRepository
                .createQueryBuilder('campaign')
                .where('campaign.status = :status', { status: 'active' })
                .andWhere('campaign.endDate < :today', { today })
                .getMany();

            for (const campaign of expiredCampaigns) {
                campaign.status = 'expired';
                await this.campaignRepository.save(campaign);

                await this.adRepository
                    .createQueryBuilder()
                    .update(Ad)
                    .set({ status: 'expired' })
                    .where('ad_set_id IN (SELECT id FROM ad_sets WHERE campaign_id = :campaignId)', { campaignId: campaign.id })
                    .execute();

                await this.notificationService.createNotification({
                    advertiserId: campaign.advertiserId,
                    title: "Notification about Campaign Status",
                    message: `Your Campaign has expired!`
                });
            }
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async changeCampaignStatus(id: string, status: string): Promise<Campaign> {
        try {
            const campaign = await this.findCampaignById(id);
            if (!campaign) {
                throw new Error("Campaign not found");
            }
            campaign.status = status;
            const campaignData = await this.campaignRepository.save(campaign);
            await this.notificationService.createNotification({
                advertiserId: campaignData?.advertiserId,
                title: "Notification about Campaign Status",
                message: `Your Campaign has been ${status} !`
            })
            return campaignData;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async deleteCampaign(id: string): Promise<Campaign> {
        try {
            const campaign = await this.findCampaignById(id);
            if (!campaign) {
                throw new Error("Campaign not found");
            }
            return await this.campaignRepository.remove(campaign);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async approveCampaign(id: string): Promise<Campaign> {
        try {
            const campaign = await this.findCampaignById(id);
            if(campaign.status !== 'pending') {
                throw new NotAcceptableException('Only pending campaigns can be approved');
            }
            return this.changeCampaignStatus(id, 'active')
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async rejectCampaign(id: string): Promise<Campaign> {
        try {
            const campaign = await this.findCampaignById(id);
            if(campaign.status !== 'pending') {
                throw new NotAcceptableException('Only pending campaigns can be approved');
            }
            return this.changeCampaignStatus(id, 'rejected')
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async createFullCampaign(input: CreateFullCampaignInput, file: Express.Multer.File) {
        try {
            // Validate and price the budget before uploading, so a rejected ad leaves no orphan asset.
            const budget = {
                budgetPlan: input.budgetPlan,
                dailyBudget: input.dailyBudget,
                totalBudget: input.totalBudget,
                startDate: input.startDate,
                endDate: input.endDate,
            } as BudgetShape;
            normalizeBudget(budget);

            const assetPath = await this.minioService.upload(file, `ad-creatives/${input.advertiserId}`);

            return await this.dataSource.transaction(async (manager) => {
                const creative = manager.create(AdCreative, {
                    advertiserId: input.advertiserId,
                    name: input.creativeName,
                    assetType: input.assetType,
                    asset: assetPath,
                    destinationLink: input.destinationLink,
                    status: 'active',
                });
                const savedCreative = await manager.save(creative);

                const campaign = manager.create(Campaign, {
                    advertiserId: input.advertiserId,
                    name: input.name,
                    ...budget,
                    spentAmount: 0,
                    // Every new ad is a draft until it's paid (see payCampaign).
                    status: 'draft',
                    modelType: 'display_ads',
                });
                const savedCampaign = await manager.save(campaign);

                const adSet = manager.create(AdSet, {
                    campaignId: savedCampaign.id,
                    ageMin: input.ageMin,
                    ageMax: input.ageMax,
                    gender: input.gender,
                });
                const savedAdSet = await manager.save(adSet);

                const ad = manager.create(Ad, {
                    adSetId: savedAdSet.id,
                    adCreativeId: savedCreative.id,
                    adType: input.adType,
                    placementKey: input.placementKey,
                    status: 'draft',
                });
                const savedAd = await manager.save(ad);

                return { campaign: savedCampaign, adSet: savedAdSet, ad: savedAd, adCreative: savedCreative };
            });
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new NotAcceptableException(error.message);
        }
    }
}