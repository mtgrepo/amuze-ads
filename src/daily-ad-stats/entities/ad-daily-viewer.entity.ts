import { Ad } from "src/ads/entities/ad.entity";
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

/**
 * One row per user who saw an ad on a day, however many times they saw it.
 * Reach for any period is the number of distinct users here within it.
 */
@Entity('ad_daily_viewers')
@Index(['statDate'])
export class AdDailyViewer {
    @PrimaryColumn({ type: 'uuid', name: 'ad_id' })
    adId: string;

    @PrimaryColumn({ type: 'date', name: 'stat_date' })
    statDate: string;

    /** The app's user id (or a device id for guests), as the app sends it. */
    @PrimaryColumn({ type: 'varchar', length: 100, name: 'user_id' })
    userId: string;

    @ManyToOne(() => Ad, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ad_id' })
    ad: Ad;
}
