import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { PointLedger } from "src/points/entities/point-ledger.entity";

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
