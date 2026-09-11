import { AdSet } from "src/ad-sets/entities/ad-sets.entity";
import { AdvertiserAdStats } from "src/daily-ad-stats/entities/daily-ad-stats.entity";
import { AdCreative } from "src/ad-creatives/entities/ad-creative.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('ads')
export class Ad {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 255 })
    status: string

    @Column({ type: 'varchar', length: 50, name: 'ad_type' })
    adType: string

    @Column({ type: 'varchar', length: 50, name: 'placement_key' })
    placementKey: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ type: 'uuid', name: 'ad_set_id', unique: true })
    adSetId: string

    @ManyToOne(() => AdSet, (adSet) => adSet.ads, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'ad_set_id' })
    adSet: AdSet;

    @Column({ type: 'uuid', name: 'ad_creative_id' })
    adCreativeId: string

    @ManyToOne(() => AdCreative)
    @JoinColumn({ name: 'ad_creative_id' })
    adCreative: AdCreative;

    @Column({ type: 'integer', default: 0, name: 'total_impressions' })
    totalImpressions: number;

    @Column({ type: 'integer', default: 0, name: 'total_clicks' })
    totalClicks: number;

    @Column({ type: 'integer', default: 0, name: 'total_engagements' })
    totalEngagements: number;

    @Column({ type: 'integer', default: 0, name: 'total_watches' })
    totalWatches: number;

    @OneToMany(() => AdvertiserAdStats, (adStats) => adStats.ad)
    adStats: AdvertiserAdStats[];
}
