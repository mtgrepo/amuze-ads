import { Ad } from "src/ads/entities/ad.entity";
import { AfterLoad, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity('advertiser_ad_stats')
@Unique(['adId', 'startDate'])
export class AdvertiserAdStats {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'ad_id' })
    adId: string;

    @Column({ type: 'date', name: 'stat_date' })
    startDate: Date;

    @Column({ type: 'integer' })
    impressions: number;

    @Column({ type: 'integer' })
    clicks: number;

    /** Video playback starts. */
    @Column({ type: 'integer', default: 0 })
    watches: number;

    /** Video plays that reached the end. */
    @Column({ type: 'integer', default: 0 })
    completions: number;

    /** Clicks + watches; worked out, not stored. */
    engagements: number;

    @AfterLoad()
    computeEngagements() {
        if (this.clicks !== undefined && this.watches !== undefined) {
            this.engagements = Number(this.clicks) + Number(this.watches);
        }
    }

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => Ad, (ad) => ad.adStats, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'ad_id' })
    ad: Ad;
}