import { AdSet } from "src/ad-sets/entities/ad-sets.entity";
import { AdvertiserAdStats } from "src/daily-ad-stats/entities/daily-ad-stats.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('ads')
export class Ad {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 255 })
    status: string

    @Column({ type: 'varchar', length: 50, name: 'ad_type', nullable: true })
    adType: string

    @Column({ type: 'varchar', length: 50, name: 'placement_key', nullable: true })
    placementKey: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ type: 'uuid', name: 'ad_set_id', nullable: true })
    adSetId: string | null

    @ManyToOne(() => AdSet, (adSet) => adSet.ads, {
        onDelete: 'CASCADE',
        nullable: true,
    })
    @JoinColumn({ name: 'ad_set_id' })
    adSet: AdSet;

    @OneToMany(() => AdvertiserAdStats, (adStats) => adStats.ad)
    adStats: AdvertiserAdStats[];
}