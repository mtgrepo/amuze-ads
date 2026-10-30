import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Campaign } from "src/campaigns/entities/campaign.entity";

export const OBJECTIVE_TYPES = ['impression', 'click', 'watch'] as const;
export type ObjectiveType = typeof OBJECTIVE_TYPES[number];

/** Largest target accepted, so counts and costs stay inside the integer columns. */
export const MAX_OBJECTIVE_TARGET = 100_000_000;

/**
 * A result target the customer paid for on top of the package, e.g. 500 clicks.
 * Only picked objectives are stored; the price is copied from the config when saved,
 * so later price changes never touch what was already bought.
 */
@Entity('campaign_objectives')
@Unique(['campaignId', 'objectiveType'])
export class CampaignObjective {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'campaign_id' })
    campaignId: string;

    @ManyToOne(() => Campaign, (campaign) => campaign.objectives, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @Column({ type: 'varchar', length: 20, name: 'objective_type' })
    objectiveType: ObjectiveType;

    @Column({ type: 'integer', name: 'target_count' })
    targetCount: number;

    /** Points charged for every `pricePer` items. */
    @Column({ type: 'integer' })
    price: number;

    @Column({ type: 'integer', name: 'price_per' })
    pricePer: number;

    /** ceil(targetCount / pricePer) × price */
    @Column({ type: 'integer' })
    cost: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
