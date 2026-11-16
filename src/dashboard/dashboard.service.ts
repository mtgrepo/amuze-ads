import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { PointLedger } from "src/points/entities/point-ledger.entity";
import { CampaignExtension } from "src/campaign-extensions/entities/campaign-extension.entity";
import { EXTENSION_LEDGER_REFERENCE } from "src/campaign-extensions/campaign-extension.service";

// Active campaigns ending within this many days show up in "Needs you".
const ENDING_SOON_DAYS = 3;
const ATTENTION_LIST_LIMIT = 5;

function localDateString(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Campaign)
        private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(PointLedger)
        private readonly pointLedgerRepository: Repository<PointLedger>,
    ) {}

    /** Campaign base query with the fields the attention list shows. Campaigns, ad sets and ads are 1:1:1. */
    private attentionQuery() {
        return this.campaignRepository
            .createQueryBuilder('campaign')
            .innerJoin('campaign.advertiser', 'advertiser')
            .leftJoin('advertiser.agency', 'agency')
            .innerJoin('campaign.adSets', 'adSet')
            .innerJoin('adSet.ads', 'ad')
            .select('campaign.id', 'campaignId')
            .addSelect('campaign.name', 'campaignName')
            .addSelect('advertiser.name', 'advertiserName')
            .addSelect('agency.name', 'agencyName')
            .addSelect('ad.id', 'adId')
            .addSelect('ad.placementKey', 'placementKey')
            .addSelect('ad.totalClicks', 'totalClicks')
            .addSelect('ad.totalWatches', 'totalWatches');
    }

    async getAttention() {
        const pendingCount = await this.campaignRepository.count({ where: { status: 'pending' } });

        // Paid extensions waiting for a decision; the oldest first, since late approval costs the customer days.
        const pendingExtensionCount = await this.campaignRepository.manager.count(CampaignExtension, { where: { status: 'pending' } });
        const pendingExtensions = await this.attentionQuery()
            .innerJoin(CampaignExtension, 'extension', 'extension.campaignId = campaign.id')
            .addSelect('extension.id', 'extensionId')
            .addSelect('extension.amount', 'amount')
            .addSelect('extension.days', 'days')
            .addSelect("TO_CHAR(extension.newEndDate, 'YYYY-MM-DD')", 'newEndDate')
            .addSelect('extension.createdAt', 'waitingSince')
            .where('extension.status = :status', { status: 'pending' })
            .orderBy('extension.createdAt', 'ASC')
            .limit(ATTENTION_LIST_LIMIT)
            .getRawMany();
        const pending = await this.attentionQuery()
            .addSelect('campaign.updatedAt', 'waitingSince')
            .where('campaign.status = :status', { status: 'pending' })
            .orderBy('campaign.updatedAt', 'ASC')
            .limit(ATTENTION_LIST_LIMIT)
            .getRawMany();

        const today = new Date();
        const horizon = new Date();
        horizon.setDate(horizon.getDate() + ENDING_SOON_DAYS);
        const endingSoon = await this.attentionQuery()
            .addSelect("TO_CHAR(campaign.endDate, 'YYYY-MM-DD')", 'endDate')
            .where('campaign.status = :status', { status: 'active' })
            .andWhere('campaign.endDate BETWEEN :today AND :horizon', {
                today: localDateString(today),
                horizon: localDateString(horizon),
            })
            .orderBy('campaign.endDate', 'ASC')
            .limit(ATTENTION_LIST_LIMIT)
            .getRawMany();

        const withTotals = <T extends { totalClicks: unknown; totalWatches: unknown }>(row: T) => ({
            ...row,
            totalClicks: Number(row.totalClicks),
            totalWatches: Number(row.totalWatches),
        });

        return {
            pendingCount,
            pending: pending.map(withTotals),
            endingSoon: endingSoon.map(withTotals),
            endingSoonDays: ENDING_SOON_DAYS,
            pendingExtensionCount,
            pendingExtensions: pendingExtensions.map((row) => ({
                ...withTotals(row),
                amount: Number(row.amount),
                days: Number(row.days),
            })),
        };
    }

    /** Ledger sums per entry type, optionally limited to [from, to). Spends are negative, everything else positive. */
    private async ledgerTotals(from?: Date, to?: Date): Promise<Record<string, number>> {
        let qb = this.pointLedgerRepository
            .createQueryBuilder('ledger')
            .select('ledger.type', 'type')
            .addSelect('COALESCE(SUM(ledger.amount), 0)', 'total');
        if (from && to) {
            qb = qb.where('ledger.createdAt >= :from AND ledger.createdAt < :to', { from, to });
        }
        const rows = await qb.groupBy('ledger.type').getRawMany();
        return Object.fromEntries(rows.map((r) => [r.type, Number(r.total)]));
    }

    /** Money customers paid for points: online purchases plus top-ups paid to an admin. 1 point = 1 MMK. */
    private static received(totals: Record<string, number>): number {
        return (totals.purchase ?? 0) + (totals.admin_paid ?? 0);
    }

    /** What ads earned: points spent on ads minus refunds for ads that never ran. */
    private static earned(totals: Record<string, number>): number {
        return Math.abs(totals.spend ?? 0) - (totals.refund ?? 0);
    }

    /** [from, to) for YYYY-MM-DD dates, inclusive of toDate. Defaults to the last 7 days. */
    private static dayRange(fromDate?: string, toDate?: string): { from: Date; to: Date } {
        const to = toDate ? new Date(`${toDate}T00:00:00`) : new Date();
        const from = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date(to);
        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            throw new BadRequestException('Dates must look like 2026-10-01');
        }
        if (!fromDate) {
            from.setDate(from.getDate() - 6);
        }
        from.setHours(0, 0, 0, 0);
        // Exclusive upper bound: the start of the day after toDate.
        to.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() + 1);
        return { from, to };
    }

    /**
     * The income report for [fromDate, toDate] (inclusive; default last 7 days), with the same-length period before it
     * for comparison. Two views of income, both in MMK (1 point = 1 MMK):
     * - received: money customers paid for points (KBZPay purchases + top-ups paid to an admin);
     * - earned: points spent on ads (packages, objectives, extensions) minus refunds for ads that never ran.
     * Bonus points are free, so they're a cost, not income. Unspent points are what's held in wallets right now.
     */
    async getIncome(fromDate?: string, toDate?: string) {
        const { from, to } = DashboardService.dayRange(fromDate, toDate);
        const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
        const prevFrom = new Date(from);
        prevFrom.setDate(prevFrom.getDate() - days);

        const [current, previous] = await Promise.all([this.incomeTotals(from, to), this.incomeTotals(prevFrom, from)]);

        // Each spend or refund row tied to its campaign, so it can be split by package and paying customer.
        const MAPPED = `
            SELECT l.type, l.amount, l.advertiser_id, DATE(l.created_at) AS day,
                   COALESCE(c.id, ce.id) AS campaign_id, COALESCE(c.package_name, ce.package_name) AS package_name
              FROM point_ledger l
              LEFT JOIN campaigns c ON l.reference_type = 'campaign' AND c.id::text = l.reference_id
              LEFT JOIN campaign_extensions e ON l.reference_type = $3 AND e.id::text = l.reference_id
              LEFT JOIN campaigns ce ON ce.id = e.campaign_id
             WHERE l.created_at >= $1 AND l.created_at < $2`;
        const params = [from, to, EXTENSION_LEDGER_REFERENCE];
        const run = (sql: string) => this.pointLedgerRepository.manager.query(sql, params);

        const [daily, customers, packages, held] = await Promise.all([
            run(`SELECT TO_CHAR(day, 'YYYY-MM-DD') AS date,
                        COALESCE(SUM(amount) FILTER (WHERE type IN ('purchase', 'admin_paid')), 0) AS received,
                        COALESCE(-SUM(amount) FILTER (WHERE type = 'spend'), 0) - COALESCE(SUM(amount) FILTER (WHERE type = 'refund'), 0) AS earned
                   FROM (${MAPPED}) m GROUP BY day ORDER BY day`),
            run(`SELECT m.advertiser_id AS "advertiserId", a.name, a.type,
                        COALESCE(-SUM(m.amount) FILTER (WHERE m.type = 'spend'), 0) - COALESCE(SUM(m.amount) FILTER (WHERE m.type = 'refund'), 0) AS earned,
                        COALESCE(SUM(m.amount) FILTER (WHERE m.type IN ('purchase', 'admin_paid')), 0) AS received
                   FROM (${MAPPED}) m JOIN advertisers a ON a.id = m.advertiser_id
                  GROUP BY m.advertiser_id, a.name, a.type
                 HAVING COALESCE(-SUM(m.amount) FILTER (WHERE m.type = 'spend'), 0) <> 0 OR COALESCE(SUM(m.amount) FILTER (WHERE m.type IN ('purchase', 'admin_paid')), 0) <> 0
                  ORDER BY earned DESC, received DESC LIMIT 10`),
            run(`SELECT COALESCE(package_name, 'Deleted ads') AS "packageName",
                        COALESCE(-SUM(amount) FILTER (WHERE type = 'spend'), 0) - COALESCE(SUM(amount) FILTER (WHERE type = 'refund'), 0) AS earned,
                        COUNT(DISTINCT campaign_id) FILTER (WHERE type = 'spend') AS ads
                   FROM (${MAPPED}) m WHERE type IN ('spend', 'refund')
                  GROUP BY package_name ORDER BY earned DESC`),
            this.pointLedgerRepository.manager.query(`SELECT COALESCE(SUM(points_balance), 0) AS held, COUNT(*) FILTER (WHERE points_balance > 0) AS wallets FROM advertisers`),
        ]);

        // Every day in the range, zeros included, so the chart has no gaps.
        const byDay = new Map<string, { received: number; earned: number }>(
            daily.map((d: { date: string; received: string; earned: string }) => [d.date, { received: Number(d.received), earned: Number(d.earned) }]),
        );
        const series: { date: string; received: number; earned: number }[] = [];
        for (const day = new Date(from); day < to; day.setDate(day.getDate() + 1)) {
            const key = localDateString(day);
            series.push({ date: key, ...(byDay.get(key) ?? { received: 0, earned: 0 }) });
        }

        return {
            fromDate: localDateString(from),
            toDate: localDateString(new Date(to.getTime() - 86_400_000)),
            current,
            previous,
            unspent: { points: Number(held[0]?.held ?? 0), wallets: Number(held[0]?.wallets ?? 0) },
            daily: series,
            topCustomers: customers.map((c: { advertiserId: string; name: string; type: string; earned: string; received: string }) => ({
                advertiserId: c.advertiserId, name: c.name, type: c.type, earned: Number(c.earned), received: Number(c.received),
            })),
            byPackage: packages.map((p: { packageName: string; earned: string; ads: string }) => ({ packageName: p.packageName, earned: Number(p.earned), ads: Number(p.ads) })),
        };
    }

    /** Received, earned (by packages, objectives and extensions), refunded and bonus for [from, to). */
    private async incomeTotals(from: Date, to: Date) {
        const [row] = await this.pointLedgerRepository.manager.query(
            `SELECT COALESCE(SUM(l.amount) FILTER (WHERE l.type = 'purchase'), 0) AS kbzpay,
                    COALESCE(SUM(l.amount) FILTER (WHERE l.type = 'admin_paid'), 0) AS offline,
                    COALESCE(SUM(l.amount) FILTER (WHERE l.type = 'admin_bonus'), 0) AS bonus,
                    COALESCE(SUM(l.amount) FILTER (WHERE l.type = 'refund'), 0) AS refunded,
                    COALESCE(-SUM(l.amount) FILTER (WHERE l.type = 'spend' AND l.reference_type = $3), 0) AS extensions,
                    COALESCE(-SUM(l.amount) FILTER (WHERE l.type = 'spend' AND l.reference_type IS DISTINCT FROM $3), 0) AS ads,
                    -- An ad's first payment covers its package and objectives; the objectives part is the campaign's objective cost.
                    COALESCE(SUM(LEAST(c.objective_cost, -l.amount)) FILTER (WHERE l.type = 'spend' AND l.reference_type = 'campaign'), 0) AS objectives
               FROM point_ledger l
               LEFT JOIN campaigns c ON l.reference_type = 'campaign' AND c.id::text = l.reference_id
              WHERE l.created_at >= $1 AND l.created_at < $2`,
            [from, to, EXTENSION_LEDGER_REFERENCE],
        );
        const n = (v: unknown) => Number(v ?? 0);
        const kbzpay = n(row?.kbzpay), offline = n(row?.offline);
        const objectives = n(row?.objectives), extensions = n(row?.extensions), adsPaid = n(row?.ads), refunded = n(row?.refunded);
        return {
            received: { total: kbzpay + offline, kbzpay, offline },
            earned: { total: adsPaid + extensions - refunded, packages: adsPaid - objectives, objectives, extensions, refunded },
            bonus: n(row?.bonus),
        };
    }

    /** Points movement between two dates (YYYY-MM-DD, inclusive; default: last 7 days). 1 point = 1 MMK. */
    async getPointsSummary(fromDate?: string, toDate?: string) {
        const { from, to } = DashboardService.dayRange(fromDate, toDate);
        const totals = await this.ledgerTotals(from, to);

        return {
            fromDate: localDateString(from),
            toDate: toDate ?? localDateString(new Date()),
            // Paid by the customer (online or to an admin) vs. given free.
            purchased: DashboardService.received(totals),
            bonus: totals.admin_bonus ?? 0,
            // Spends are stored negative.
            spent: Math.abs(totals.spend ?? 0),
            refunded: totals.refund ?? 0,
        };
    }

    /**
     * Headline numbers for the admin dashboard. Campaign counts are current; revenue is all-time
     * plus the selected range, both as earned from ads and as money received.
     */
    async getSummary(fromDate?: string, toDate?: string) {
        const statusRows = await this.campaignRepository
            .createQueryBuilder('campaign')
            .select('campaign.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('campaign.status')
            .getRawMany();
        const byStatus: Record<string, number> = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.count)]));
        const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

        const { from, to } = DashboardService.dayRange(fromDate, toDate);
        const [allTime, inRange] = await Promise.all([this.ledgerTotals(), this.ledgerTotals(from, to)]);

        return {
            campaigns: {
                total,
                drafts: byStatus.draft ?? 0,
                pending: byStatus.pending ?? 0,
                active: byStatus.active ?? 0,
            },
            revenue: {
                earned: { allTime: DashboardService.earned(allTime), inRange: DashboardService.earned(inRange) },
                received: { allTime: DashboardService.received(allTime), inRange: DashboardService.received(inRange) },
            },
        };
    }
}
