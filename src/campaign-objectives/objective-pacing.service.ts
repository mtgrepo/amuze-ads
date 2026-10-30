import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { Cron } from "@nestjs/schedule";
import { DataSource } from "typeorm";

/** Most a behind-target ad can be favoured over a normal one, so other advertisers' ads still show. */
export const MAX_PACING_WEIGHT = 5;

/**
 * How strongly to favour one objective: 1 when met or on pace, rising to MAX_PACING_WEIGHT the further
 * delivery falls behind where it should be by now (an even spread over the run).
 */
export function objectiveWeight(targetCount: number, delivered: number, elapsed: number): number {
    if (delivered >= targetCount) return 1;
    const expected = targetCount * elapsed;
    const pace = expected <= 0 ? 1 : delivered / expected;
    if (pace >= 1) return 1;
    return Math.min(1 + (1 - pace) * 4, MAX_PACING_WEIGHT);
}

/** Share of the run that has passed, from the start of the first day to the end of the last, clamped to 0..1. */
export function elapsedShare(startDate: string, endDate: string, now = new Date()): number {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    const end = new Date(`${endDate}T00:00:00`).getTime() + 86_400_000;
    if (end <= start) return 1;
    return Math.min(Math.max((now.getTime() - start) / (end - start), 0), 1);
}

/**
 * Serving weights for ads of active campaigns that bought objectives. Recomputed every 5 minutes from the
 * daily stats rather than per request; an ad with no entry is weighted 1.
 */
@Injectable()
export class ObjectivePacingService implements OnModuleInit {
    private readonly logger = new Logger(ObjectivePacingService.name);
    private weights = new Map<string, number>();

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async onModuleInit(): Promise<void> {
        await this.refreshWeights().catch((error) => this.logger.error(`Pacing refresh failed: ${error.message}`));
    }

    weightFor(adId: string): number {
        return this.weights.get(adId) ?? 1;
    }

    @Cron('*/5 * * * *')
    async refreshWeights(): Promise<void> {
        const rows: {
            ad_id: string; start_date: string; end_date: string; objective_type: string; target_count: number;
            impression: number; click: number; watch: number;
        }[] = await this.dataSource.query(
            `WITH delivered AS (
                SELECT st.campaign_id,
                       COALESCE(SUM(s.impressions), 0)::int AS impression,
                       COALESCE(SUM(s.clicks), 0)::int AS click,
                       COALESCE(SUM(s.watches), 0)::int AS watch
                  FROM advertiser_ad_stats s
                  JOIN ads a ON a.id = s.ad_id
                  JOIN ad_sets st ON st.id = a.ad_set_id
                  JOIN campaigns c ON c.id = st.campaign_id
                 WHERE c.status = 'active' AND s.stat_date BETWEEN c.start_date AND c.end_date
                 GROUP BY st.campaign_id
            )
            SELECT a.id AS ad_id, c.start_date::text AS start_date, c.end_date::text AS end_date,
                   o.objective_type, o.target_count,
                   COALESCE(d.impression, 0) AS impression, COALESCE(d.click, 0) AS click, COALESCE(d.watch, 0) AS watch
              FROM campaign_objectives o
              JOIN campaigns c ON c.id = o.campaign_id AND c.status = 'active'
              JOIN ad_sets st ON st.campaign_id = c.id
              JOIN ads a ON a.ad_set_id = st.id
              LEFT JOIN delivered d ON d.campaign_id = c.id`,
        );

        const now = new Date();
        const next = new Map<string, number>();
        for (const row of rows) {
            const delivered = Number(row[row.objective_type as 'impression' | 'click' | 'watch'] ?? 0);
            const weight = objectiveWeight(Number(row.target_count), delivered, elapsedShare(row.start_date, row.end_date, now));
            // The furthest-behind objective sets the ad's weight.
            next.set(row.ad_id, Math.max(next.get(row.ad_id) ?? 1, weight));
        }
        this.weights = next;
    }
}
