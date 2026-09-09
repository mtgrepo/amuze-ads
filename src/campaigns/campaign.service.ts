import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { Campaign } from "./entities/campaign.entity";
import { DataSource, Repository } from "typeorm";
import { NotificationService } from "../notifications/notification.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TransactionService } from "src/transactions/transaction.service";
import { Transactions } from "src/transactions/entities/transaction.entity";
import { MinioService } from "src/minio/minio.service";
import { AdCreative } from "src/ad-creatives/entities/ad-creative.entity";
import { AdSet } from "src/ad-sets/entities/ad-sets.entity";
import { Ad } from "src/ads/entities/ad.entity";

export interface CreateFullCampaignInput {
    advertiserId: string;
    role: string;
    name: string;
    budgetPlan: string;
    dailyBudget: number;
    totalBudget: number;
    startDate: Date;
    endDate: Date;
    paymentMethod: string;
    creativeName: string;
    assetType: string;
    destinationLink: string;
    ageMin: number;
    ageMax: number;
    gender: string;
    location: string;
    category: string;
    adType: string;
    placementKey: string;
}

@Injectable()
export class CampaignService {
    constructor (
        @InjectRepository(Campaign)
        private campaignRepository: Repository<Campaign>,
        private readonly notificationService: NotificationService,
        private readonly transactionService: TransactionService,
        private readonly minioService: MinioService,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async createCampaign(campaignData: Partial<Campaign>, paymentMethod: string): Promise<Campaign> {
        try {
            const campaign = await this.campaignRepository.create(campaignData);
            const savedCampaign = await this.campaignRepository.save(campaign);
            await this.transactionService.createTransaction({
                advertiserId: campaignData.advertiserId,
                referenceId: savedCampaign.id,
                amount: campaignData.totalBudget || 0,
                paymentMethod,
                referenceType: "campaign",
            });
            return savedCampaign;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findCampaignList(advertiserId?: string): Promise<(Campaign & { transaction: Transactions | null })[]> {
        try {
            const campaigns = await this.campaignRepository.find({
                where: advertiserId ? { advertiserId } : {},
                relations: ['advertiser', 'post'],
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

    async updateCampaign(id: string, updateData: Partial<Campaign>, paymentMethod?: string): Promise<Campaign> {
        try {
            const campaign = await this.findCampaignById(id);
            if (!campaign) {
                throw new Error("Campaign not found");
            }
            Object.assign(campaign, updateData);
            const updatedCampaign = await this.campaignRepository.save(campaign);

            if (updateData.totalBudget !== undefined || paymentMethod !== undefined) {
                await this.transactionService.updateTransactionByReference(id, 'campaign', {
                    advertiserId: updatedCampaign.advertiserId,
                    amount: updateData.totalBudget ?? updatedCampaign.totalBudget,
                    paymentMethod: paymentMethod ?? 'cash'
                });
            }

            return updatedCampaign;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async autoStopCampaigns() {
        try {
            const campaigns = await this.findCampaignList();
            for (const campaign of campaigns) {
                if (campaign.spentAmount >= campaign.totalBudget) {
                    await this.changeCampaignStatus(campaign.id, "completed");
                }
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
            const assetPath = await this.minioService.upload(file, `ad-creatives/${input.advertiserId}`);
            const isAdmin = input.role === 'admin';

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
                    budgetPlan: input.budgetPlan,
                    dailyBudget: input.dailyBudget,
                    totalBudget: input.totalBudget,
                    spentAmount: 0,
                    startDate: input.startDate,
                    endDate: input.endDate,
                    status: isAdmin ? 'active' : 'pending',
                    modelType: 'display_ads',
                });
                const savedCampaign = await manager.save(campaign);

                const adSet = manager.create(AdSet, {
                    campaignId: savedCampaign.id,
                    ageMin: input.ageMin,
                    ageMax: input.ageMax,
                    gender: input.gender,
                    location: input.location,
                    category: input.category,
                });
                const savedAdSet = await manager.save(adSet);

                const ad = manager.create(Ad, {
                    adSetId: savedAdSet.id,
                    adCreativeId: savedCreative.id,
                    adType: input.adType,
                    placementKey: input.placementKey,
                    status: isAdmin ? 'active' : 'pending',
                });
                const savedAd = await manager.save(ad);

                const transaction = manager.create(Transactions, {
                    advertiserId: input.advertiserId,
                    paymentMethod: input.paymentMethod,
                    amount: input.totalBudget,
                    referenceType: 'campaign',
                    referenceId: savedCampaign.id,
                });
                await manager.save(transaction);

                return { campaign: savedCampaign, adSet: savedAdSet, ad: savedAd, adCreative: savedCreative };
            });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }
}