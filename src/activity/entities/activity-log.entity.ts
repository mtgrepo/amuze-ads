import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type ActorType = 'admin' | 'advertiser' | 'system';

/** One field's value before and after a change. */
export type FieldChange = { from: unknown; to: unknown };

/**
 * Who did what, and when: one row per action on an ad, campaign, advertiser, package, points or setting.
 * Written in the same transaction as the change, and never edited or deleted by the app.
 */
@Entity('activity_log')
@Index(['campaignId', 'createdAt'])
@Index(['advertiserId', 'createdAt'])
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['createdAt'])
export class ActivityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @Column({ type: 'varchar', length: 20, name: 'actor_type' })
    actorType: ActorType;

    @Column({ type: 'varchar', length: 64, name: 'actor_id', nullable: true })
    actorId: string | null;

    /** The name at the time: admins come from AMUZE and can be renamed or removed later. */
    @Column({ type: 'varchar', length: 150, name: 'actor_name', nullable: true })
    actorName: string | null;

    /** e.g. ad.approved, campaign.budget_changed, advertiser.deactivated */
    @Column({ type: 'varchar', length: 60 })
    action: string;

    @Column({ type: 'varchar', length: 30, name: 'entity_type' })
    entityType: string;

    @Column({ type: 'varchar', length: 64, name: 'entity_id' })
    entityId: string;

    /** Set for anything about an ad, so one ad's whole history is one query. No foreign key: deleted ads keep their history. */
    @Column({ type: 'uuid', name: 'campaign_id', nullable: true })
    campaignId: string | null;

    /** Whose account it concerns, for the advertiser's activity and the customer portal. */
    @Column({ type: 'uuid', name: 'advertiser_id', nullable: true })
    advertiserId: string | null;

    /** Ready to show, e.g. "Approved", "Budget changed". Never names the person; the actor columns do. */
    @Column({ type: 'varchar', length: 300 })
    summary: string;

    /** Field → { from, to } for edits. Only whitelisted fields, never passwords or tokens. */
    @Column({ type: 'jsonb', nullable: true })
    changes: Record<string, FieldChange> | null;

    /** Extras such as points, a reject reason or extension days. */
    @Column({ type: 'jsonb', nullable: true })
    meta: Record<string, unknown> | null;
}
