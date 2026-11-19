import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

/**
 * An admin's change to one ad slot's display rule. Slots without a row use the defaults in display-rules.ts,
 * so the table only holds what was changed.
 */
@Entity('ad_display_rules')
@Unique(['adType', 'placementKey'])
export class AdDisplayRule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50, name: 'ad_type' })
    adType: string;

    @Column({ type: 'varchar', length: 50, name: 'placement_key' })
    placementKey: string;

    @Column({ type: 'boolean', default: true })
    enabled: boolean;

    @Column({ type: 'int', name: 'every_min', nullable: true })
    everyMin: number | null;

    @Column({ type: 'int', name: 'every_max', nullable: true })
    everyMax: number | null;

    @Column({ type: 'int', name: 'cooldown_minutes', nullable: true })
    cooldownMinutes: number | null;

    @Column({ type: 'varchar', length: 10, name: 'video_position', nullable: true })
    videoPosition: string | null;

    @Column({ type: 'jsonb', nullable: true })
    modules: string[] | null;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;
}
