import { Injectable, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdvertiserAdStats } from "./entities/daily-ad-stats.entity";
import { Repository } from "typeorm";
import { Ad } from "src/ads/entities/ad.entity";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { Cron, CronExpression } from "@nestjs/schedule";

function getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const EVENT_COLUMN: Record<string, 'impressions' | 'clicks' | 'watches' | 'engagements'> = {
    view: 'impressions',
    click: 'clicks',
    watch: 'watches',
    engagement: 'engagements',
};

const AD_TOTAL_COLUMN: Record<string, { property: 'totalImpressions' | 'totalClicks' | 'totalWatches' | 'totalEngagements'; column: string }> = {
    view: { property: 'totalImpressions', column: 'total_impressions' },
    click: { property: 'totalClicks', column: 'total_clicks' },
    watch: { property: 'totalWatches', column: 'total_watches' },
    engagement: { property: 'totalEngagements', column: 'total_engagements' },
};

@Injectable()
export class DailyAdStatsService {
    constructor(
        @InjectRepository(AdvertiserAdStats)
        private readonly advertiserAdStatsRepository: Repository<AdvertiserAdStats>,
        @InjectRepository(Ad)
        private readonly adRepository: Repository<Ad>,
        @InjectRepository(Campaign)
        private readonly campaignRepository: Repository<Campaign>,
    ) {}

    async trackEvent(adId: string, event: string): Promise<void> {
        try {
            const column = EVENT_COLUMN[event];
            if (!column) {
                throw new NotAcceptableException(`Invalid event type: ${event}`);
            }

            const today = getLocalDateString(new Date());

            const result = await this.advertiserAdStatsRepository
                .createQueryBuilder()
                .update(AdvertiserAdStats)
                .set({ [column]: () => `"${column}" + 1` })
                .where('ad_id = :adId', { adId })
                .andWhere('stat_date = :today', { today })
                .execute();

            if (!result.affected) {
                const stats = this.advertiserAdStatsRepository.create({
                    adId,
                    startDate: new Date(),
                    impressions: 0,
                    clicks: 0,
                    engagements: 0,
                    watches: 0,
                    [column]: 1,
                });
                await this.advertiserAdStatsRepository.save(stats);
            }

            const adTotal = AD_TOTAL_COLUMN[event];
            await this.adRepository
                .createQueryBuilder()
                .update(Ad)
                .set({ [adTotal.property]: () => `"${adTotal.column}" + 1` })
                .where('id = :adId', { adId })
                .execute();
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

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
            .where('ad.status = :adStatus', { adStatus: 'active' })
            .andWhere('campaign.status = :campaignStatus', { campaignStatus: 'active' })
            .getMany();

            const today = getLocalDateString(new Date());

            const existingStats = await this.advertiserAdStatsRepository
                .createQueryBuilder('stats')
                .select('stats.adId', 'adId')
                .where('stats.startDate = :today', { today })
                .getRawMany();
            const existingAdIds = new Set(existingStats.map(s => s.adId));

            const adsNeedingStats = activeAds.filter(ad => !existingAdIds.has(ad.id));

            const dailyStats = adsNeedingStats.map(ad => this.advertiserAdStatsRepository.create({
                adId: ad.id,
                startDate: new Date(),
                impressions: 0,
                clicks: 0,
                engagements: 0,
            }));

            if (dailyStats.length > 0) {
                await this.advertiserAdStatsRepository.save(dailyStats);
            }
            
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async incrementStats(adId: string, statsToIncrement: Partial<AdvertiserAdStats>) {
        try {
            const today = getLocalDateString(new Date());

            const stats = await this.advertiserAdStatsRepository
                .createQueryBuilder('stats')
                .where('stats.ad_id = :adId', { adId })
                .andWhere('stats.stat_date = :today', { today })
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
        const today = getLocalDateString(new Date());
        let statsQb = this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .select('COALESCE(SUM(stats.impressions), 0)', 'totalImpressions')
            .addSelect('COALESCE(SUM(stats.clicks), 0)', 'totalClicks')
            .addSelect('COALESCE(SUM(stats.engagements), 0)', 'totalEngagements')
            .addSelect('COALESCE(SUM(stats.watches), 0)', 'totalWatches')
            .where('stats.startDate = :today', { today });

        if (advertiserId) {
            statsQb = statsQb
                .innerJoin('stats.ad', 'ad')
                .innerJoin('ad.adSet', 'adSet')
                .innerJoin('adSet.campaign', 'campaign')
                .andWhere('campaign.advertiserId = :advertiserId', { advertiserId });
        }

        const statsResult = await statsQb.getRawOne();

        let activeAdsQb = this.adRepository
            .createQueryBuilder('ad')
            .innerJoin('ad.adSet', 'adSet')
            .innerJoin('adSet.campaign', 'campaign')
            .where('ad.status = :adStatus', { adStatus: 'active' })
            .andWhere('campaign.status = :campaignStatus', { campaignStatus: 'active' });

        if (advertiserId) {
            activeAdsQb = activeAdsQb.andWhere('campaign.advertiserId = :advertiserId', { advertiserId });
        }

        const activeAds = await activeAdsQb.getCount();

        return {
            totalImpressions: Number(statsResult?.totalImpressions ?? 0),
            totalClicks: Number(statsResult?.totalClicks ?? 0),
            totalEngagements: Number(statsResult?.totalEngagements ?? 0),
            totalWatches: Number(statsResult?.totalWatches ?? 0),
            activeAds,
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
            .addSelect('COALESCE(SUM(stats.watches), 0)', 'watches')
            .where('stats.startDate BETWEEN :startDate AND :endDate', {
                startDate: getLocalDateString(startDate),
                endDate: getLocalDateString(endDate),
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
            watches: Number(r.watches),
        }));
    }

    async getTopAds(limit: number = 5, metric: string = 'clicks', advertiserId?: string) {
        const METRIC_PROPERTY: Record<string, 'totalImpressions' | 'totalClicks' | 'totalEngagements' | 'totalWatches'> = {
            impressions: 'totalImpressions',
            clicks: 'totalClicks',
            engagements: 'totalEngagements',
            watches: 'totalWatches',
        };
        const orderProperty = METRIC_PROPERTY[metric] ?? 'totalClicks';

        let qb = this.adRepository
            .createQueryBuilder('ad')
            .select('ad.id', 'adId')
            .addSelect('campaign.name', 'campaignName')
            .addSelect('ad.totalImpressions', 'totalImpressions')
            .addSelect('ad.totalClicks', 'totalClicks')
            .addSelect('ad.totalEngagements', 'totalEngagements')
            .addSelect('ad.totalWatches', 'totalWatches')
            .innerJoin('ad.adSet', 'adSet')
            .innerJoin('adSet.campaign', 'campaign');

        if (advertiserId) {
            qb = qb.where('campaign.advertiserId = :advertiserId', { advertiserId });
        }

        const results = await qb
            .orderBy(`ad.${orderProperty}`, 'DESC')
            .limit(limit)
            .getRawMany();

        return results.map(r => ({
            campaignName: r.campaignName as string,
            totalImpressions: Number(r.totalImpressions),
            totalClicks: Number(r.totalClicks),
            totalEngagements: Number(r.totalEngagements),
            totalWatches: Number(r.totalWatches),
        }));
    }

}
