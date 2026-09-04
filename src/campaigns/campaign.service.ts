import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Campaign } from "./entities/campaign.entity";
import { Repository } from "typeorm";
import { NotificationService } from "../notifications/notification.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TransactionService } from "src/transactions/transaction.service";
import { Transactions } from "src/transactions/entities/transaction.entity";

@Injectable()
export class CampaignService {
    constructor (
        @InjectRepository(Campaign)
        private campaignRepository: Repository<Campaign>,
        private readonly notificationService: NotificationService,
        private readonly transactionService: TransactionService
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
}