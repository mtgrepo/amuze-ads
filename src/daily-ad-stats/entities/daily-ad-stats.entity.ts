import { Ad } from "src/ads/entities/ad.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity('advertiser_ad_stats')
@Unique(['adId', 'statDate'])
export class AdvertiserAdStats {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'ad_id' })
    adId: string;

    @Column({ type: 'date', name: 'stat_date' })
    statDate: Date;

    @Column({ type: 'integer' })
    impressions: number;

    @Column({ type: 'integer' })
    clicks: number;

    @Column({ type: 'integer' })
    spent: number;

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