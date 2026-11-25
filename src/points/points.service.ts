import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository, Brackets } from "typeorm";
import { Advertiser } from "src/advertisers/entities/advertiser.entity";
import { Transactions } from "src/transactions/entities/transaction.entity";
import { DEFAULT_PAYMENT_METHOD, OFFLINE_PAYMENT_METHOD, TRANSACTION_REFERENCE } from "src/transactions/payment";
import { PointLedger } from "./entities/point-ledger.entity";
import type { PointLedgerType } from "./point-types";
import { ActivityService } from "src/activity/activity.service";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { CampaignExtension } from "src/campaign-extensions/entities/campaign-extension.entity";
import { AdminUser } from "src/admin-users/entities/admin-user.entity";

/** One ledger entry with everything it links to, for the transaction detail page. */
export interface LedgerEntryDetail {
    entry: Omit<PointLedger, 'advertiser'> & { balanceBefore: number };
    wallet: { id: string; name: string; type: string; email: string | null };
    /** The money behind a purchase or paid top-up. */
    payment: { id: string; paymentMethod: string; amount: number; createdAt: Date } | null;
    /** The ad this paid for or refunded, directly or through an extension. adId opens the ad page. */
    campaign: {
        id: string; name: string; status: string; startDate: Date; endDate: Date;
        packageName: string; packageQuantity: number; packageDays: number; totalBudget: number;
        adId: string | null; advertiser: { id: string; name: string };
    } | null;
    extension: {
        id: string; status: string; days: number; quantity: number; amount: number;
        startDate: string; previousEndDate: string; newEndDate: string; createdAt: Date; reviewedAt: Date | null;
    } | null;
    /** Who made it. Admins only; customers never see admin names. */
    admin: { id: string; name: string } | null;
    /** Other entries for the same ad or extension, e.g. its payment and its refund. */
    related: { id: string; type: PointLedgerType; amount: number; note: string | null; createdAt: Date }[];
}

export interface LedgerRef {
    referenceType?: string;
    referenceId?: string;
    note?: string;
    createdByAdminId?: string;
}

/**
 * The only place a points balance changes. Each change locks the wallet row, appends a
 * point_ledger row and updates the cached balance in the caller's DB transaction.
 */
@Injectable()
export class PointsService {
    constructor(
        private readonly activity: ActivityService,
        @InjectRepository(PointLedger)
        private ledgerRepository: Repository<PointLedger>,
        @InjectRepository(Advertiser)
        private advertiserRepository: Repository<Advertiser>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    /** Customer buys points. Until a gateway exists the KBZPay payment is only recorded. */
    async purchase(walletId: string, amount: number): Promise<{ balance: number; entry: PointLedger }> {
        return this.dataSource.transaction(async (manager) => {
            const entry = await this.credit(manager, walletId, amount, 'purchase', { note: `Bought with ${DEFAULT_PAYMENT_METHOD}` });
            await this.recordPayment(manager, entry, DEFAULT_PAYMENT_METHOD, TRANSACTION_REFERENCE.pointPurchase);
            await this.activity.record(manager, {
                action: 'points.purchased', entityType: 'points', entityId: entry.id, advertiserId: walletId,
                summary: `Bought ${amount.toLocaleString('en-US')} points`, meta: { points: amount, method: DEFAULT_PAYMENT_METHOD, balanceAfter: Number(entry.balanceAfter) },
            });
            return { balance: entry.balanceAfter, entry };
        });
    }

    /** Admin adds points: 'paid' (customer paid offline) or 'bonus' (promotional). */
    async topUp(walletId: string, amount: number, kind: 'paid' | 'bonus', note: string, adminId: string): Promise<{ balance: number; entry: PointLedger }> {
        return this.dataSource.transaction(async (manager) => {
            const entry = await this.credit(manager, walletId, amount, kind === 'paid' ? 'admin_paid' : 'admin_bonus', { note, createdByAdminId: adminId });
            // Bonus points are free, so only a paid top-up is money in.
            if (kind === 'paid') {
                await this.recordPayment(manager, entry, OFFLINE_PAYMENT_METHOD, TRANSACTION_REFERENCE.adminTopUp);
            }
            await this.activity.record(manager, {
                action: 'points.added', entityType: 'points', entityId: entry.id, advertiserId: walletId,
                summary: `Added ${amount.toLocaleString('en-US')} ${kind === 'bonus' ? 'bonus ' : ''}points`,
                meta: { points: amount, kind, note, balanceAfter: Number(entry.balanceAfter) },
            });
            return { balance: entry.balanceAfter, entry };
        });
    }

    /** Records the money behind a credit and links both ways: the ledger entry points at the transaction. */
    private async recordPayment(manager: EntityManager, entry: PointLedger, paymentMethod: string, referenceType: string): Promise<void> {
        const transaction = await manager.save(manager.create(Transactions, {
            advertiserId: entry.advertiserId,
            paymentMethod,
            amount: entry.amount,
            referenceType,
            referenceId: entry.id,
        }));
        entry.referenceType = 'transaction';
        entry.referenceId = transaction.id;
        await manager.save(entry);
    }

    private async lockWallet(manager: EntityManager, walletId: string): Promise<Advertiser> {
        const wallet = await manager.findOne(Advertiser, { where: { id: walletId }, lock: { mode: 'pessimistic_write' } });
        if (!wallet) {
            throw new BadRequestException('Wallet not found');
        }
        if (wallet.agencyId) {
            throw new BadRequestException("Agency clients use their agency's points");
        }
        return wallet;
    }

    private async apply(manager: EntityManager, walletId: string, signedAmount: number, type: PointLedgerType, ref: LedgerRef = {}): Promise<PointLedger> {
        const wallet = await this.lockWallet(manager, walletId);
        const balanceAfter = wallet.pointsBalance + signedAmount;
        if (balanceAfter < 0) {
            throw new BadRequestException(`Not enough points (need ${-signedAmount}, have ${wallet.pointsBalance})`);
        }
        await manager.update(Advertiser, { id: walletId }, { pointsBalance: balanceAfter });
        return manager.save(manager.create(PointLedger, {
            advertiserId: walletId,
            type,
            amount: signedAmount,
            balanceAfter,
            referenceType: ref.referenceType ?? null,
            referenceId: ref.referenceId ?? null,
            note: ref.note ?? null,
            createdByAdminId: ref.createdByAdminId ?? null,
        }));
    }

    credit(manager: EntityManager, walletId: string, amount: number, type: PointLedgerType, ref?: LedgerRef): Promise<PointLedger> {
        return this.apply(manager, walletId, Math.abs(amount), type, ref);
    }

    debit(manager: EntityManager, walletId: string, amount: number, type: PointLedgerType, ref?: LedgerRef): Promise<PointLedger> {
        return this.apply(manager, walletId, -Math.abs(amount), type, ref);
    }

    /**
     * Points a campaign holds against its total budget: its own spends minus refunds, plus approved
     * extensions (approval adds their amount to the total budget). Pending or rejected extensions don't count.
     */
    async netSpentForCampaign(manager: EntityManager, campaignId: string): Promise<number> {
        const row = await manager
            .createQueryBuilder(PointLedger, 'ledger')
            .select('COALESCE(SUM(ledger.amount), 0)', 'sum')
            .where('ledger.type IN (:...types)', { types: ['spend', 'refund'] })
            .andWhere(new Brackets((qb) => {
                qb.where('ledger.referenceType = :campaignRef AND ledger.referenceId = :campaignId', { campaignRef: 'campaign', campaignId })
                    .orWhere(
                        `ledger.referenceType = :extensionRef AND ledger.referenceId IN (
                            SELECT id::text FROM campaign_extensions WHERE campaign_id::text = :campaignId AND status = 'approved')`,
                        // ::text: :campaignId is also compared with the text reference_id above, so Postgres types it as text.
                        { extensionRef: 'campaign_extension' },
                    );
            }))
            .getRawOne();
        return -Number(row?.sum ?? 0);
    }

    /** Throws unless the account can own a wallet (exists and isn't an agency client). */
    async assertWalletOwner(walletId: string): Promise<Advertiser> {
        const wallet = await this.advertiserRepository.findOne({ where: { id: walletId }, select: ['id', 'name', 'agencyId', 'pointsBalance'] });
        if (!wallet) {
            throw new BadRequestException('Account not found');
        }
        if (wallet.agencyId) {
            throw new BadRequestException("Agency clients use their agency's points");
        }
        return wallet;
    }

    /**
     * Every wallet's history for the admin points page, newest first, with the wallet owner on each entry,
     * plus the points customers hold right now (agency clients have no wallet of their own).
     */
    async getLedger(): Promise<{ totalBalance: number; entries: PointLedger[] }> {
        const entries = await this.ledgerRepository.find({
            relations: { advertiser: true },
            select: { advertiser: { id: true, name: true, type: true } },
            order: { createdAt: 'DESC' },
        });
        const row = await this.advertiserRepository
            .createQueryBuilder('advertiser')
            .select('COALESCE(SUM(advertiser.pointsBalance), 0)', 'total')
            .where('advertiser.agencyId IS NULL')
            .getRawOne();
        return { totalBalance: Number(row?.total ?? 0), entries };
    }

    /**
     * One entry and what it links to. With walletId (a customer), only that wallet's entries are found, and the
     * admin who made it is left out.
     */
    async getEntryDetail(id: string, walletId?: string): Promise<LedgerEntryDetail> {
        const found = await this.ledgerRepository.findOne({
            where: walletId ? { id, advertiserId: walletId } : { id },
            relations: { advertiser: true },
            select: { advertiser: { id: true, name: true, type: true, email: true } },
        });
        if (!found) {
            throw new NotFoundException('Transaction not found');
        }
        const { advertiser, ...entry } = found;

        let payment: LedgerEntryDetail['payment'] = null;
        let campaignId: string | null = null;
        let extension: LedgerEntryDetail['extension'] = null;
        if (entry.referenceType === 'transaction' && entry.referenceId) {
            const t = await this.dataSource.getRepository(Transactions).findOne({ where: { id: entry.referenceId } });
            if (t) payment = { id: t.id, paymentMethod: t.paymentMethod, amount: Number(t.amount), createdAt: t.createdAt };
        } else if (entry.referenceType === 'campaign') {
            campaignId = entry.referenceId;
        } else if (entry.referenceType === 'campaign_extension' && entry.referenceId) {
            const e = await this.dataSource.getRepository(CampaignExtension).findOne({ where: { id: entry.referenceId } });
            if (e) {
                campaignId = e.campaignId;
                extension = {
                    id: e.id, status: e.status, days: e.days, quantity: e.quantity, amount: Number(e.amount),
                    startDate: e.startDate, previousEndDate: e.previousEndDate, newEndDate: e.newEndDate,
                    createdAt: e.createdAt, reviewedAt: e.reviewedAt,
                };
            }
        }

        let campaign: LedgerEntryDetail['campaign'] = null;
        if (campaignId) {
            // The ad may have been deleted since; the entry still shows its name from the note.
            const c = await this.dataSource.getRepository(Campaign).findOne({
                where: { id: campaignId },
                relations: { advertiser: true },
                select: { advertiser: { id: true, name: true } },
            });
            if (c) {
                const [ad]: { id: string }[] = await this.dataSource.query(
                    `SELECT a.id FROM ads a JOIN ad_sets s ON s.id = a.ad_set_id WHERE s.campaign_id = $1 ORDER BY a.created_at LIMIT 1`,
                    [c.id],
                );
                campaign = {
                    id: c.id, name: c.name, status: c.status, startDate: c.startDate, endDate: c.endDate,
                    packageName: c.packageName, packageQuantity: c.packageQuantity, packageDays: c.packageDays,
                    totalBudget: Number(c.totalBudget), adId: ad?.id ?? null,
                    advertiser: { id: c.advertiser.id, name: c.advertiser.name },
                };
            }
        }

        let admin: LedgerEntryDetail['admin'] = null;
        if (!walletId && entry.createdByAdminId) {
            const a = await this.dataSource.getRepository(AdminUser).findOne({ where: { id: entry.createdByAdminId }, select: ['id', 'name'] });
            admin = a ? { id: a.id, name: a.name } : { id: entry.createdByAdminId, name: 'Removed admin' };
        }

        // A purchase's transaction belongs to that entry alone, so only ads and extensions have related entries.
        const related = entry.referenceId && entry.referenceType !== 'transaction'
            ? (await this.ledgerRepository.find({
                where: { referenceType: entry.referenceType!, referenceId: entry.referenceId, advertiserId: entry.advertiserId },
                order: { createdAt: 'ASC' },
            })).filter((r) => r.id !== entry.id).map((r) => ({ id: r.id, type: r.type, amount: Number(r.amount), note: r.note, createdAt: r.createdAt }))
            : [];

        return {
            entry: { ...entry, balanceBefore: Number(entry.balanceAfter) - Number(entry.amount) },
            wallet: { id: advertiser.id, name: advertiser.name, type: advertiser.type, email: advertiser.email },
            payment, campaign, extension, admin, related,
        };
    }

    async getWallet(walletId: string): Promise<{ balance: number; history: PointLedger[] }> {
        const wallet = await this.assertWalletOwner(walletId);
        const history = await this.ledgerRepository.find({
            where: { advertiserId: walletId },
            order: { createdAt: 'DESC' },
        });
        return { balance: wallet.pointsBalance, history };
    }
}
