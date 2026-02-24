import { Injectable, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdvertiserAdStats } from "./entities/daily-ad-stats.entity";
import { Repository } from "typeorm";
import { Ad } from "src/ads/entities/ad.entity";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SystemConfigsService } from "src/system-configs/system-configs.service";

@Injectable()
export class DailyAdStatsService {
    constructor(
        @InjectRepository(AdvertiserAdStats)
        private readonly advertiserAdStatsRepository: Repository<AdvertiserAdStats>,
        @InjectRepository(Ad)
        private readonly adRepository: Repository<Ad>,
        @InjectRepository(Campaign)
        private readonly campaignRepository: Repository<Campaign>,
        private readonly systemConfigsService: SystemConfigsService,
    ) {}

    async create(adStatsData: Partial<AdvertiserAdStats>): Promise<AdvertiserAdStats> {
        try {
            const adStats = this.advertiserAdStatsRepository.create(adStatsData);
            return await this.advertiserAdStatsRepository.save(adStats);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async generateDailyAdStats() {
        try {
            const activeAds = await this.adRepository
            .createQueryBuilder('ad')
            .innerJoinAndSelect('ad.adSet', 'adSet')
            .innerJoinAndSelect('adSet.campaign', 'campaign')
            .innerJoinAndSelect('campaign.post', 'post')
            .where('ad.status = :adStatus', { adStatus: 'active' })
            .andWhere('campaign.status = :campaignStatus', { campaignStatus: 'active' })
            .andWhere('post.status = :postStatus', { postStatus: 'active' })
            .getMany();

            const pricingConfigs = await this.systemConfigsService.getByCategory('pricing');

            const pricingMap = new Map<string, Record<string, any>>();
            for (const config of pricingConfigs) {
                pricingMap.set(config.configKey, config.configValue);
            }

            const dailyStats = activeAds.map(ad => {
                const campaign = ad.adSet.campaign;
                const dailyBudget = campaign.dailyBudget || 0;
                const objective = campaign.objective;
                const pricing = pricingMap.get(objective);

                let pricingMode: string | null = null;
                let maxImpressions = 0;
                let maxClicks = 0;
                let maxEngagements = 0;

                if (pricing) {
                    pricingMode = pricing.mode;
                    const rate = pricing.rate;
                    const unit = pricing.unit || 1;

                    switch (pricingMode) {
                        case 'CPM':
                            maxImpressions = Math.floor((dailyBudget / rate) * unit);
                            break;
                        case 'CPC':
                            maxClicks = Math.floor(dailyBudget / rate);
                            break;
                        case 'CPE':
                            maxEngagements = Math.floor(dailyBudget / rate);
                            break;
                    }
                }

                return this.advertiserAdStatsRepository.create({
                    adId: ad.id,
                    startDate: new Date(),
                    impressions: 0,
                    clicks: 0,
                    spent: 0,
                    engagements: 0,
                    pricingMode,
                    maxImpressions,
                    maxClicks,
                    maxEngagements,
                    dailyBudget,
                });
            });

            await this.advertiserAdStatsRepository.save(dailyStats);

            const campaignMap = new Map<string, Campaign>();
            for (const ad of activeAds) {
                const campaign = ad.adSet.campaign;
                if (!campaignMap.has(campaign.id)) {
                    campaignMap.set(campaign.id, campaign);
                }
            }

            for (const campaign of campaignMap.values()) {
                campaign.spentAmount = (campaign.spentAmount || 0) + campaign.dailyBudget;
            }

            await this.campaignRepository.save([...campaignMap.values()]);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async incrementStats(adId: string, statsToIncrement: Partial<AdvertiserAdStats>) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const stats = await this.advertiserAdStatsRepository
                .createQueryBuilder('stats')
                .where('stats.ad_id = :adId', { adId })
                .andWhere('stats.stat_date = :today', { today: today.toISOString().split('T')[0] })
                .getOne();

            if (!stats) {
                throw new NotFoundException('No stats record found for this ad today');
            }

            const updatedStats = Object.assign(stats, statsToIncrement);
            return await this.advertiserAdStatsRepository.save(updatedStats);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async checkAdServable(adId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .where('stats.ad_id = :adId', { adId })
            .andWhere('stats.stat_date = :today', { today: today.toISOString().split('T')[0] })
            .getOne();

        if (!stats) {
            throw new NotFoundException('No stats record found for this ad today');
        }

        let servable = true;
        let reason: string | undefined = undefined;
        let remaining = 0;

        switch (stats.pricingMode) {
            case 'CPM':
                remaining = stats.maxImpressions - stats.impressions;
                if (stats.impressions >= stats.maxImpressions) {
                    servable = false;
                    reason = 'Daily impression limit reached';
                }
                break;
            case 'CPC':
                remaining = stats.maxClicks - stats.clicks;
                if (stats.clicks >= stats.maxClicks) {
                    servable = false;
                    reason = 'Daily click limit reached';
                }
                break;
            case 'CPE':
                remaining = stats.maxEngagements - stats.engagements;
                if (stats.engagements >= stats.maxEngagements) {
                    servable = false;
                    reason = 'Daily engagement limit reached';
                }
                break;
            default:
                servable = false;
                reason = 'Unknown pricing mode';
                break;
        }

        return {
            servable,
            reason,
            pricingMode: stats.pricingMode,
            remaining: Math.max(remaining, 0),
        };
    }

    async findByAdId(adId: string): Promise<AdvertiserAdStats[]> {
        try {
            const stats = await this.advertiserAdStatsRepository.findBy({ adId });
            return stats;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findByDateRange(adId: string, startDate: Date, endDate: Date): Promise<AdvertiserAdStats[]> {
        try {
            const status = await this.advertiserAdStatsRepository.createQueryBuilder("stats")
                .where("stats.adId = :adId", { adId })
                .andWhere("stats.startDate BETWEEN :startDate AND :endDate", { startDate, endDate });
            return await status.getMany();
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async getAdminOverview(advertiserId?: string) {
        const today = new Date().toISOString().split('T')[0];
        let qb = this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .select('COALESCE(SUM(stats.impressions), 0)', 'totalImpressions')
            .addSelect('COALESCE(SUM(stats.clicks), 0)', 'totalClicks')
            .addSelect('COALESCE(SUM(stats.engagements), 0)', 'totalEngagements')
            .addSelect('COUNT(DISTINCT stats.adId)', 'activeAds')
            .where('stats.startDate = :today', { today });

        if (advertiserId) {
            qb = qb
                .innerJoin('stats.ad', 'ad')
                .innerJoin('ad.adSet', 'adSet')
                .innerJoin('adSet.campaign', 'campaign')
                .andWhere('campaign.advertiserId = :advertiserId', { advertiserId });
        }

        const result = await qb.getRawOne();

        return {
            totalImpressions: Number(result?.totalImpressions ?? 0),
            totalClicks: Number(result?.totalClicks ?? 0),
            totalEngagements: Number(result?.totalEngagements ?? 0),
            activeAds: Number(result?.activeAds ?? 0),
        };
    }

    async getAdminTrend(days: number = 7, advertiserId?: string) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (days - 1));

        let qb = this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .select('stats.startDate', 'date')
            .addSelect('COALESCE(SUM(stats.impressions), 0)', 'impressions')
            .addSelect('COALESCE(SUM(stats.clicks), 0)', 'clicks')
            .addSelect('COALESCE(SUM(stats.engagements), 0)', 'engagements')
            .where('stats.startDate BETWEEN :startDate AND :endDate', {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
            });

        if (advertiserId) {
            qb = qb
                .innerJoin('stats.ad', 'ad')
                .innerJoin('ad.adSet', 'adSet')
                .innerJoin('adSet.campaign', 'campaign')
                .andWhere('campaign.advertiserId = :advertiserId', { advertiserId });
        }

        const results = await qb
            .groupBy('stats.startDate')
            .orderBy('stats.startDate', 'ASC')
            .getRawMany();

        return results.map(r => ({
            date: r.date,
            impressions: Number(r.impressions),
            clicks: Number(r.clicks),
            engagements: Number(r.engagements),
        }));
    }

    async getPricingModeDistribution(advertiserId?: string) {
        const today = new Date().toISOString().split('T')[0];
        let qb = this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .select("COALESCE(stats.pricingMode, 'Unknown')", 'pricingMode')
            .addSelect('COUNT(DISTINCT stats.adId)', 'count')
            .where('stats.startDate = :today', { today });

        if (advertiserId) {
            qb = qb
                .innerJoin('stats.ad', 'ad')
                .innerJoin('ad.adSet', 'adSet')
                .innerJoin('adSet.campaign', 'campaign')
                .andWhere('campaign.advertiserId = :advertiserId', { advertiserId });
        }

        const results = await qb.groupBy('stats.pricingMode').getRawMany();

        return results.map(r => ({
            pricingMode: r.pricingMode || 'Unknown',
            count: Number(r.count),
        }));
    }

    async getTopAds(limit: number = 5, metric: string = 'clicks', advertiserId?: string) {
        const allowedMetrics = ['clicks', 'impressions', 'engagements'];
        const safeMetric = allowedMetrics.includes(metric) ? metric : 'clicks';

        let qb = this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .select('stats.adId', 'adId')
            .addSelect('campaign.name', 'campaignName')
            .addSelect('SUM(stats.impressions)', 'totalImpressions')
            .addSelect('SUM(stats.clicks)', 'totalClicks')
            .addSelect('SUM(stats.engagements)', 'totalEngagements')
            .innerJoin('stats.ad', 'ad')
            .innerJoin('ad.adSet', 'adSet')
            .innerJoin('adSet.campaign', 'campaign');

        if (advertiserId) {
            qb = qb.where('campaign.advertiserId = :advertiserId', { advertiserId });
        }

        const results = await qb
            .groupBy('stats.adId')
            .addGroupBy('campaign.name')
            .orderBy(`SUM(stats.${safeMetric})`, 'DESC')
            .limit(limit)
            .getRawMany();

        return results.map(r => ({
            campaignName: r.campaignName as string,
            totalImpressions: Number(r.totalImpressions),
            totalClicks: Number(r.totalClicks),
            totalEngagements: Number(r.totalEngagements),
        }));
    }

}
