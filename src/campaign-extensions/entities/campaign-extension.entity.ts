import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Campaign } from "src/campaigns/entities/campaign.entity";

export const EXTENSION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ExtensionStatus = typeof EXTENSION_STATUSES[number];

/**
 * A paid request to run a campaign for more days. Its points are held in the ledger against the
 * extension itself (referenceType 'campaign_extension'), so rejecting it refunds only these points,
 * never the campaign's first payment. Approval moves the campaign's end date and grows its total budget.
 */
@Entity('campaign_extensions')
export class CampaignExtension {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'campaign_id' })
    campaignId: string;

    @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    /** First extra day: the day after the old end date, or the request day if that has passed. */
    @Column({ type: 'date', name: 'start_date' })
    startDate: string;

    @Column({ type: 'date', name: 'previous_end_date' })
    previousEndDate: string;

    @Column({ type: 'date', name: 'new_end_date' })
    newEndDate: string;

    @Column({ type: 'integer' })
    days: number;

    /** Points charged. 1 point = 1 MMK. */
    @Column({ type: 'integer' })
    amount: number;

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: ExtensionStatus;

    @Column({ type: 'uuid', name: 'requested_by_id' })
    requestedById: string;

    @Column({ type: 'varchar', length: 20, name: 'requested_by_role' })
    requestedByRole: string;

    @Column({ type: 'uuid', name: 'reviewed_by_admin_id', nullable: true })
    reviewedByAdminId: string | null;

    @Column({ type: 'timestamp', name: 'reviewed_at', nullable: true })
    reviewedAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
