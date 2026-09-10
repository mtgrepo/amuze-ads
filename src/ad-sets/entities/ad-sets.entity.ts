import { Ad } from "src/ads/entities/ad.entity";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('ad_sets')
export class AdSet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'integer', name: 'age_min' })
    ageMin: number;

    @Column({ type: 'integer', name: 'age_max' })
    ageMax: number;

    @Column({ type: 'varchar', length: 255 })
    gender: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ type: 'uuid', name: 'campaign_id', unique: true })
    campaignId: string

    @ManyToOne(() => Campaign, (campaign) => campaign.adSets, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @OneToMany(() => Ad, (ad) => ad.adSet)
    ads: Ad[]

}