import { Ad } from "src/ads/entities/ad.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

/**
 * Daily counts per ad split by the viewer's age and gender, as the app reports them on each event.
 * Only counts are kept, never which user had which age. Age 0 means unknown; gender is male, female or unknown.
 * Ages are grouped when reading (see demographics.ts), so the groups can change without losing past data.
 */
@Entity('ad_daily_demographics')
@Index(['statDate'])
export class AdDailyDemographic {
    @PrimaryColumn({ type: 'uuid', name: 'ad_id' })
    adId: string;

    @PrimaryColumn({ type: 'date', name: 'stat_date' })
    statDate: string;

    @PrimaryColumn({ type: 'smallint' })
    age: number;

    @PrimaryColumn({ type: 'varchar', length: 10 })
    gender: string;

    @Column({ type: 'integer', default: 0 })
    impressions: number;

    @Column({ type: 'integer', default: 0 })
    clicks: number;

    @Column({ type: 'integer', default: 0 })
    watches: number;

    @Column({ type: 'integer', default: 0 })
    completions: number;

    @ManyToOne(() => Ad, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ad_id' })
    ad: Ad;
}
