import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Advertiser } from "../../advertisers/entities/advertiser.entity";

@Entity('ad_creatives')
export class AdCreative {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'uuid', name: 'advertiser_id' })
    advertiserId: string

    @ManyToOne(() => Advertiser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'advertiser_id' })
    advertiser: Advertiser;

    @Column({ type: 'varchar', length: 255 })
    name: string

    @Column({ type: 'varchar', length: 20, name: 'asset_type' })
    assetType: string

    @Column({ type: 'varchar', length: 500 })
    asset: string

    @Column({ type: 'varchar', length: 500, name: 'destination_link' })
    destinationLink: string

    @Column({ type: 'varchar', length: 100 })
    status: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date
}
