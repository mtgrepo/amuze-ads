import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { Advertiser } from "src/advertisers/entities/advertiser.entity";
import { Transactions } from "src/transactions/entities/transaction.entity";
import { DEFAULT_PAYMENT_METHOD, OFFLINE_PAYMENT_METHOD, TRANSACTION_REFERENCE } from "src/transactions/payment";
import { PointLedger } from "./entities/point-ledger.entity";
import type { PointLedgerType } from "./point-types";

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

    /** Points a campaign still holds: its spends minus its refunds, as a positive number. */
    async netSpentForCampaign(manager: EntityManager, campaignId: string): Promise<number> {
        const row = await manager
            .createQueryBuilder(PointLedger, 'ledger')
            .select('COALESCE(SUM(ledger.amount), 0)', 'sum')
            .where('ledger.referenceType = :referenceType', { referenceType: 'campaign' })
            .andWhere('ledger.referenceId = :campaignId', { campaignId })
            .andWhere('ledger.type IN (:...types)', { types: ['spend', 'refund'] })
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

    async getWallet(walletId: string): Promise<{ balance: number; history: PointLedger[] }> {
        const wallet = await this.assertWalletOwner(walletId);
        const history = await this.ledgerRepository.find({
            where: { advertiserId: walletId },
            order: { createdAt: 'DESC' },
        });
        return { balance: wallet.pointsBalance, history };
    }
}
