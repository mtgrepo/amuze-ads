import { AdSet } from "src/ad-sets/entities/ad-sets.entity";
import { AdvertiserPost } from "src/advertiser-posts/entities/advertiser-post.entity";
import { Advertiser } from "src/advertisers/entities/advertiser.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('campaigns')
export class Campaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255 })
    objective: string;

    @Column({ type: 'integer', name: 'daily_budget' })
    dailyBudget: number;

    @Column({ type: 'integer', name: 'total_budget' })
    totalBudget: number;

    @Column({ type: 'integer', name: 'spent_amount', default: 0 })
    spentAmount: number;

    @Column({ type: 'date', name: 'start_date'})
    startDate: Date;

    @Column({ type: 'date', name: 'end_date'})
    endDate: Date;

    @Column({ type: 'varchar', length: 255 })
    status: string;

    @Column({ type: 'varchar', length: 50, name: 'model_type', default: 'display_ads' })
    modelType: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ type: 'uuid', name: 'advertiser_id' })
    advertiserId: string

    @ManyToOne(() => Advertiser, (advertiser) => advertiser.campaigns, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'advertiser_id' })
    advertiser: Advertiser;

    @Column({ type: 'uuid', name: 'post_id', nullable: true })
    postId: string | null

    @ManyToOne(() => AdvertiserPost, (post) => post.campaigns, {
        onDelete: 'CASCADE',
        nullable: true,
    })
    @JoinColumn({ name: 'post_id' })
    post: AdvertiserPost | null;

    @OneToMany(() => AdSet, (adSet) => adSet.campaign)
    adSets: AdSet[]

}