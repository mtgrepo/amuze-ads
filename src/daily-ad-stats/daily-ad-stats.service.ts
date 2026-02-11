import { Injectable, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdvertiserAdStats } from "./entities/daily-ad-stats.entity";
import { Repository } from "typeorm";
import { Ad } from "src/ads/entities/ad.entity";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SystemConfigsService } from "src/system-configs/system-configs.service";

@Injectable()
export class DailyAdStatsService {
    constructor(
        @InjectRepository(AdvertiserAdStats)
        private readonly advertiserAdStatsRepository: Repository<AdvertiserAdStats>,
        @InjectRepository(Ad)
        private readonly adRepository: Repository<Ad>,
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
            const activeAds = await this.adRepository.find({
                where: { status: 'active' },
                relations: ['adSet', 'adSet.campaign'],
            });

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

}
