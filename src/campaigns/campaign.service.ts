import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Campaign } from "./entities/campaign.entity";
import { Repository } from "typeorm";
import { NotificationService } from "../notifications/notification.service";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class CampaignService {
    constructor (
        @InjectRepository(Campaign)
        private campaignRepository: Repository<Campaign>,
        private readonly notificationService: NotificationService
    ) {}

    async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
        try {
            const campaign = await this.campaignRepository.create(campaignData);
            return await this.campaignRepository.save(campaign);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findCampaignList(): Promise<Campaign[]> {
        try {
            const data = await this.campaignRepository.find({ relations: ['advertiser', 'post'] });
            return data;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findCampaignById(id: string): Promise<Campaign> {
        try {
            const campaign = await this.campaignRepository.findOneBy({ id });
            if(!campaign) {
                throw new Error ("Campaign not found");
            }
            return campaign;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async updateCampaign(id: string, updateData: Partial<Campaign>): Promise<Campaign> {
        try {
            const campaign = await this.findCampaignById(id);
            if (!campaign) {
                throw new Error("Campaign not found");
            }
            Object.assign(campaign, updateData);
            return await this.campaignRepository.save(campaign);
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
}