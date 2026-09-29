import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Advertiser } from "src/advertisers/entities/advertiser.entity";
import type { PointLedgerType } from "../point-types";

// Append-only history of every points change.
@Entity('point_ledger')
@Check('CHK_point_ledger_type', `"type" IN ('purchase', 'admin_paid', 'admin_bonus', 'spend', 'refund')`)
@Index('IDX_point_ledger_advertiser', ['advertiserId', 'createdAt'])
@Index('IDX_point_ledger_reference', ['referenceType', 'referenceId'])
export class PointLedger {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // The wallet owner (standalone advertiser or agency).
    @Column({ type: 'uuid', name: 'advertiser_id' })
    advertiserId: string;

    @ManyToOne(() => Advertiser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'advertiser_id', foreignKeyConstraintName: 'FK_point_ledger_advertiser' })
    advertiser: Advertiser;

    @Column({ type: 'varchar', length: 20 })
    type: PointLedgerType;

    // Signed: + credit, - debit.
    @Column({ type: 'integer' })
    amount: number;

    @Column({ type: 'integer', name: 'balance_after' })
    balanceAfter: number;

    @Column({ type: 'varchar', length: 50, name: 'reference_type', nullable: true })
    referenceType: string | null;

    @Column({ type: 'varchar', length: 255, name: 'reference_id', nullable: true })
    referenceId: string | null;

    @Column({ type: 'text', nullable: true })
    note: string | null;

    @Column({ type: 'uuid', name: 'created_by_admin_id', nullable: true })
    createdByAdminId: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
