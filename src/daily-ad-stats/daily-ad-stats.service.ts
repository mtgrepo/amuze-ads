import { BadRequestException, HttpException, Injectable, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdvertiserAdStats } from "./entities/daily-ad-stats.entity";
import { AdDailyViewer } from "./entities/ad-daily-viewer.entity";
import { Repository, SelectQueryBuilder } from "typeorm";
import { Ad } from "src/ads/entities/ad.entity";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { Cron, CronExpression } from "@nestjs/schedule";
import type { TrackEvent } from "src/ad-serving/dto/track-event.dto";

function getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Upper bound for the ads table on the performance page.
const MAX_TOP_ADS = 50;

// Each tracked event adds one to a daily counter and to the ad's running total.
const EVENT_COLUMN: Record<TrackEvent, { daily: string; total: string }> = {
    view: { daily: 'impressions', total: 'total_impressions' },
    click: { daily: 'clicks', total: 'total_clicks' },
    watch: { daily: 'watches', total: 'total_watches' },
    complete: { daily: 'completions', total: 'total_completions' },
};

// Engagements are clicks + watches; they aren't stored.
const ENGAGEMENTS_SQL = 'COALESCE(SUM(stats.clicks), 0) + COALESCE(SUM(stats.watches), 0)';

const TOP_AD_ORDER: Record<string, string> = {
    clicks: 'SUM(stats.clicks)',
    impressions: 'SUM(stats.impressions)',
    watches: 'SUM(stats.watches)',
    completions: 'SUM(stats.completions)',
    engagements: 'SUM(stats.clicks) + SUM(stats.watches)',
};

interface DateRange {
    startDate: string;
    endDate: string;
}

/** The report's date range; the last 7 days when no start is given. */
function rangeOf(fromDate?: string, toDate?: string): DateRange {
    const endDate = toDate ? new Date(toDate) : new Date();
    const startDate = fromDate ? new Date(fromDate) : new Date();
    if (!fromDate) {
        startDate.setDate(startDate.getDate() - 6);
    }
    return { startDate: getLocalDateString(startDate), endDate: getLocalDateString(endDate) };
}

@Injectable()
export class DailyAdStatsService {
    constructor(
        @InjectRepository(AdvertiserAdStats)
        private readonly advertiserAdStatsRepository: Repository<AdvertiserAdStats>,
        @InjectRepository(AdDailyViewer)
        private readonly adDailyViewerRepository: Repository<AdDailyViewer>,
        @InjectRepository(Ad)
        private readonly adRepository: Repository<Ad>,
        @InjectRepository(Campaign)
        private readonly campaignRepository: Repository<Campaign>,
    ) {}

    /** Counts one event from the app. A view also records the user for reach. */
    async trackEvent(adId: string, event: TrackEvent, userId: string): Promise<void> {
        try {
            const column = EVENT_COLUMN[event];
            if (!column) {
                throw new BadRequestException(`Invalid event type: ${event}`);
            }

            const ad = await this.adRepository.findOne({
                where: { id: adId },
                relations: { adCreative: true },
                select: { id: true, adCreative: { id: true, assetType: true } },
            });
            if (!ad) {
                throw new NotFoundException('Ad not found');
            }
            if ((event === 'watch' || event === 'complete') && ad.adCreative?.assetType !== 'video') {
                throw new BadRequestException('Watch and complete events are only for video ads');
            }

            const today = getLocalDateString(new Date());
            const counts = { impressions: 0, clicks: 0, watches: 0, completions: 0, [column.daily]: 1 };

            await this.advertiserAdStatsRepository.manager.transaction(async (manager) => {
                // One row per ad per day; the upsert also covers two first events of the day arriving together.
                await manager.query(
                    `INSERT INTO advertiser_ad_stats (ad_id, stat_date, impressions, clicks, watches, completions)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (ad_id, stat_date) DO UPDATE SET "${column.daily}" = advertiser_ad_stats."${column.daily}" + 1`,
                    [adId, today, counts.impressions, counts.clicks, counts.watches, counts.completions],
                );
                if (event === 'view') {
                    await manager.query(
                        `INSERT INTO ad_daily_viewers (ad_id, stat_date, user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                        [adId, today, userId],
                    );
                }
                await manager.query(`UPDATE ads SET "${column.total}" = "${column.total}" + 1 WHERE id = $1`, [adId]);
            });
        } catch (error) {
            if (error instanceof HttpException) throw error;
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
                watches: 0,
                completions: 0,
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

    /** The advertiser who owns an ad (through its campaign), for access checks. */
    async findAdOwnerId(adId: string): Promise<string> {
        const row = await this.adRepository
            .createQueryBuilder('ad')
            .innerJoin('ad.adSet', 'adSet')
            .innerJoin('adSet.campaign', 'campaign')
            .select('campaign.advertiserId', 'advertiserId')
            .where('ad.id = :adId', { adId })
            .getRawOne();
        if (!row) {
            throw new NotFoundException('Ad not found');
        }
        return row.advertiserId as string;
    }

    /**
     * Distinct users who saw the ads in the range. Group it (by day, ad, placement...) for reach per group;
     * a period's reach is never the sum of its days, since one person seen on two days counts once.
     */
    private reachQuery(range: DateRange, advertiserIds?: string[], adId?: string): SelectQueryBuilder<AdDailyViewer> {
        let qb = this.adDailyViewerRepository
            .createQueryBuilder('viewer')
            .innerJoin('viewer.ad', 'ad')
            .innerJoin('ad.adSet', 'adSet')
            .innerJoin('adSet.campaign', 'campaign')
            .select('COUNT(DISTINCT viewer.userId)', 'reach')
            .where('viewer.statDate BETWEEN :startDate AND :endDate', range);
        if (advertiserIds) {
            qb = qb.andWhere('campaign.advertiserId IN (:...advertiserIds)', { advertiserIds });
        }
        if (adId) {
            qb = qb.andWhere('viewer.adId = :adId', { adId });
        }
        return qb;
    }

    /** `adId` narrows the totals to one ad (the caller has already checked access to it). */
    async getAdminOverview(fromDate?: string, toDate?: string, advertiserIds?: string[], adId?: string) {
        if (advertiserIds && advertiserIds.length === 0) {
            return { totalImpressions: 0, totalReach: 0, totalClicks: 0, totalEngagements: 0, totalWatches: 0, totalCompletions: 0, activeAds: 0 };
        }
        const range = rangeOf(fromDate, toDate);

        let statsQb = this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .select('COALESCE(SUM(stats.impressions), 0)', 'totalImpressions')
            .addSelect('COALESCE(SUM(stats.clicks), 0)', 'totalClicks')
            .addSelect(ENGAGEMENTS_SQL, 'totalEngagements')
            .addSelect('COALESCE(SUM(stats.watches), 0)', 'totalWatches')
            .addSelect('COALESCE(SUM(stats.completions), 0)', 'totalCompletions')
            .where('stats.startDate BETWEEN :startDate AND :endDate', range);

        if (advertiserIds) {
            statsQb = statsQb
                .innerJoin('stats.ad', 'ad')
                .innerJoin('ad.adSet', 'adSet')
                .innerJoin('adSet.campaign', 'campaign')
                .andWhere('campaign.advertiserId IN (:...advertiserIds)', { advertiserIds });
        }
        if (adId) {
            statsQb = statsQb.andWhere('stats.adId = :adId', { adId });
        }

        const [statsResult, reachResult] = await Promise.all([
            statsQb.getRawOne(),
            this.reachQuery(range, advertiserIds, adId).getRawOne(),
        ]);

        let activeAdsQb = this.adRepository
            .createQueryBuilder('ad')
            .innerJoin('ad.adSet', 'adSet')
            .innerJoin('adSet.campaign', 'campaign')
            .where('ad.status = :adStatus', { adStatus: 'active' })
            .andWhere('campaign.status = :campaignStatus', { campaignStatus: 'active' });

        if (advertiserIds) {
            activeAdsQb = activeAdsQb.andWhere('campaign.advertiserId IN (:...advertiserIds)', { advertiserIds });
        }
        if (adId) {
            activeAdsQb = activeAdsQb.andWhere('ad.id = :adId', { adId });
        }

        const activeAds = await activeAdsQb.getCount();

        return {
            totalImpressions: Number(statsResult?.totalImpressions ?? 0),
            totalReach: Number(reachResult?.reach ?? 0),
            totalClicks: Number(statsResult?.totalClicks ?? 0),
            totalEngagements: Number(statsResult?.totalEngagements ?? 0),
            totalWatches: Number(statsResult?.totalWatches ?? 0),
            totalCompletions: Number(statsResult?.totalCompletions ?? 0),
            activeAds,
        };
    }

    async getAdminTrend(fromDate?: string, toDate?: string, advertiserIds?: string[], adId?: string) {
        if (advertiserIds && advertiserIds.length === 0) return [];
        const range = rangeOf(fromDate, toDate);

        let qb = this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .select("TO_CHAR(stats.startDate, 'YYYY-MM-DD')", 'date')
            .addSelect('COALESCE(SUM(stats.impressions), 0)', 'impressions')
            .addSelect('COALESCE(SUM(stats.clicks), 0)', 'clicks')
            .addSelect(ENGAGEMENTS_SQL, 'engagements')
            .addSelect('COALESCE(SUM(stats.watches), 0)', 'watches')
            .addSelect('COALESCE(SUM(stats.completions), 0)', 'completions')
            .where('stats.startDate BETWEEN :startDate AND :endDate', range);

        if (advertiserIds) {
            qb = qb
                .innerJoin('stats.ad', 'ad')
                .innerJoin('ad.adSet', 'adSet')
                .innerJoin('adSet.campaign', 'campaign')
                .andWhere('campaign.advertiserId IN (:...advertiserIds)', { advertiserIds });
        }
        if (adId) {
            qb = qb.andWhere('stats.adId = :adId', { adId });
        }

        const [results, reachRows] = await Promise.all([
            qb.groupBy('stats.startDate').orderBy('stats.startDate', 'ASC').getRawMany(),
            this.reachQuery(range, advertiserIds, adId)
                .addSelect("TO_CHAR(viewer.statDate, 'YYYY-MM-DD')", 'date')
                .groupBy('viewer.statDate')
                .getRawMany(),
        ]);
        const reachByDate = new Map(reachRows.map(r => [r.date as string, Number(r.reach)]));

        return results.map(r => ({
            date: r.date,
            impressions: Number(r.impressions),
            reach: reachByDate.get(r.date) ?? 0,
            clicks: Number(r.clicks),
            engagements: Number(r.engagements),
            watches: Number(r.watches),
            completions: Number(r.completions),
        }));
    }

    async getTopAds(limit: number = 5, metric: string = 'clicks', fromDate?: string, toDate?: string, advertiserIds?: string[]) {
        if (advertiserIds && advertiserIds.length === 0) return [];
        const order = TOP_AD_ORDER[metric] ?? TOP_AD_ORDER.clicks;
        const range = rangeOf(fromDate, toDate);

        let qb = this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .select('stats.adId', 'adId')
            .addSelect('campaign.id', 'campaignId')
            .addSelect('campaign.name', 'campaignName')
            .addSelect("TO_CHAR(campaign.endDate, 'YYYY-MM-DD')", 'endDate')
            .addSelect('advertiser.name', 'advertiserName')
            .addSelect('agency.name', 'agencyName')
            .addSelect('ad.placementKey', 'placementKey')
            .addSelect('campaign.status', 'status')
            .addSelect('SUM(stats.impressions)', 'totalImpressions')
            .addSelect('SUM(stats.clicks)', 'totalClicks')
            .addSelect(ENGAGEMENTS_SQL, 'totalEngagements')
            .addSelect('SUM(stats.watches)', 'totalWatches')
            .addSelect('SUM(stats.completions)', 'totalCompletions')
            .innerJoin('stats.ad', 'ad')
            .innerJoin('ad.adSet', 'adSet')
            .innerJoin('adSet.campaign', 'campaign')
            .innerJoin('campaign.advertiser', 'advertiser')
            .leftJoin('advertiser.agency', 'agency')
            .where('stats.startDate BETWEEN :startDate AND :endDate', range);

        if (advertiserIds) {
            qb = qb.andWhere('campaign.advertiserId IN (:...advertiserIds)', { advertiserIds });
        }

        const results = await qb
            .groupBy('stats.adId')
            .addGroupBy('campaign.id')
            .addGroupBy('advertiser.name')
            .addGroupBy('agency.name')
            .addGroupBy('ad.placementKey')
            .orderBy(order, 'DESC')
            .limit(Math.min(Math.max(limit, 1), MAX_TOP_ADS))
            .getRawMany();

        const adIds = results.map(r => r.adId as string);
        const reachRows = adIds.length
            ? await this.reachQuery(range)
                .addSelect('viewer.adId', 'adId')
                .andWhere('viewer.adId IN (:...adIds)', { adIds })
                .groupBy('viewer.adId')
                .getRawMany()
            : [];
        const reachByAd = new Map(reachRows.map(r => [r.adId as string, Number(r.reach)]));

        return results.map(r => ({
            adId: r.adId as string,
            campaignId: r.campaignId as string,
            campaignName: r.campaignName as string,
            endDate: r.endDate as string,
            advertiserName: r.advertiserName as string,
            agencyName: (r.agencyName ?? null) as string | null,
            placementKey: r.placementKey as string,
            status: r.status as string,
            totalImpressions: Number(r.totalImpressions),
            totalReach: reachByAd.get(r.adId) ?? 0,
            totalClicks: Number(r.totalClicks),
            totalEngagements: Number(r.totalEngagements),
            totalWatches: Number(r.totalWatches),
            totalCompletions: Number(r.totalCompletions),
        }));
    }

    async getPlacementBreakdown(fromDate?: string, toDate?: string, advertiserIds?: string[]) {
        if (advertiserIds && advertiserIds.length === 0) return [];
        const range = rangeOf(fromDate, toDate);

        let qb = this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .innerJoin('stats.ad', 'ad')
            .innerJoin('ad.adSet', 'adSet')
            .innerJoin('adSet.campaign', 'campaign')
            .select('ad.placementKey', 'placementKey')
            .addSelect('COALESCE(SUM(stats.impressions), 0)', 'impressions')
            .addSelect('COALESCE(SUM(stats.clicks), 0)', 'clicks')
            .addSelect('COALESCE(SUM(stats.watches), 0)', 'watches')
            .addSelect('COALESCE(SUM(stats.completions), 0)', 'completions')
            .addSelect(ENGAGEMENTS_SQL, 'engagements')
            .where('stats.startDate BETWEEN :startDate AND :endDate', range);

        if (advertiserIds) {
            qb = qb.andWhere('campaign.advertiserId IN (:...advertiserIds)', { advertiserIds });
        }

        const [results, reachRows] = await Promise.all([
            qb.groupBy('ad.placementKey')
                .orderBy('SUM(stats.clicks)', 'DESC')
                .addOrderBy('SUM(stats.watches)', 'DESC')
                .getRawMany(),
            this.reachQuery(range, advertiserIds)
                .addSelect('ad.placementKey', 'placementKey')
                .groupBy('ad.placementKey')
                .getRawMany(),
        ]);
        const reachByPlacement = new Map(reachRows.map(r => [r.placementKey as string, Number(r.reach)]));

        return results.map(r => ({
            placementKey: r.placementKey as string,
            impressions: Number(r.impressions),
            reach: reachByPlacement.get(r.placementKey) ?? 0,
            clicks: Number(r.clicks),
            watches: Number(r.watches),
            completions: Number(r.completions),
            engagements: Number(r.engagements),
        }));
    }

    /** Delivery per advertiser in the range, e.g. one row per agency client. */
    async getAdvertiserBreakdown(fromDate?: string, toDate?: string, advertiserIds?: string[]) {
        if (advertiserIds && advertiserIds.length === 0) return [];
        const range = rangeOf(fromDate, toDate);

        let qb = this.advertiserAdStatsRepository
            .createQueryBuilder('stats')
            .innerJoin('stats.ad', 'ad')
            .innerJoin('ad.adSet', 'adSet')
            .innerJoin('adSet.campaign', 'campaign')
            .select('campaign.advertiserId', 'advertiserId')
            .addSelect('COALESCE(SUM(stats.impressions), 0)', 'impressions')
            .addSelect('COALESCE(SUM(stats.clicks), 0)', 'clicks')
            .addSelect('COALESCE(SUM(stats.watches), 0)', 'watches')
            .addSelect('COALESCE(SUM(stats.completions), 0)', 'completions')
            .addSelect(ENGAGEMENTS_SQL, 'engagements')
            .where('stats.startDate BETWEEN :startDate AND :endDate', range);

        if (advertiserIds) {
            qb = qb.andWhere('campaign.advertiserId IN (:...advertiserIds)', { advertiserIds });
        }

        const [results, reachRows] = await Promise.all([
            qb.groupBy('campaign.advertiserId').getRawMany(),
            this.reachQuery(range, advertiserIds)
                .addSelect('campaign.advertiserId', 'advertiserId')
                .groupBy('campaign.advertiserId')
                .getRawMany(),
        ]);
        const reachByAdvertiser = new Map(reachRows.map(r => [r.advertiserId as string, Number(r.reach)]));

        return results.map(r => ({
            advertiserId: r.advertiserId as string,
            impressions: Number(r.impressions),
            reach: reachByAdvertiser.get(r.advertiserId) ?? 0,
            clicks: Number(r.clicks),
            watches: Number(r.watches),
            completions: Number(r.completions),
            engagements: Number(r.engagements),
        }));
    }

}
