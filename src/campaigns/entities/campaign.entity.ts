import { AdSet } from "src/ad-sets/entities/ad-sets.entity";
import { Advertiser } from "src/advertisers/entities/advertiser.entity";
import { AdPackage } from "src/ad-packages/entities/ad-package.entity";
import { CampaignObjective } from "src/campaign-objectives/entities/campaign-objective.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('campaigns')
export class Campaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'uuid', name: 'package_id' })
    packageId: string;

    @ManyToOne(() => AdPackage, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'package_id' })
    package: AdPackage;

    // A copy of the package as bought, so admin edits never change an existing campaign.
    @Column({ type: 'varchar', length: 100, name: 'package_name' })
    packageName: string;

    @Column({ type: 'integer', name: 'package_days' })
    packageDays: number;

    @Column({ type: 'integer', name: 'package_price' })
    packagePrice: number;

    /** Units bought; approved extensions add to it. */
    @Column({ type: 'integer', name: 'package_quantity' })
    packageQuantity: number;

    /** packagePrice × packageQuantity */
    @Column({ type: 'integer', name: 'plan_cost' })
    planCost: number;

    /** Sum of the objectives' costs. */
    @Column({ type: 'integer', name: 'objective_cost', default: 0 })
    objectiveCost: number;

    /** planCost + objectiveCost: the amount paid and refunded. */
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

    @OneToMany(() => AdSet, (adSet) => adSet.campaign)
    adSets: AdSet[]

    @OneToMany(() => CampaignObjective, (objective) => objective.campaign)
    objectives: CampaignObjective[]

}