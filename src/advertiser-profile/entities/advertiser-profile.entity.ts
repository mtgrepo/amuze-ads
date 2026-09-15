import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Advertiser } from "../../advertisers/entities/advertiser.entity";

@Entity('advertiser_profiles')
export class AdvertiserProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    advertiser_id: string

    @ManyToOne(() => Advertiser, advertiser => advertiser.profiles)
    @JoinColumn({ name: 'advertiser_id' }) // maps the DB column
    advertiser: Advertiser

    @Column({ type: 'varchar', length: 255 })
    business_name: string

    @Column({ type: 'varchar', length: 255 })
    business_no: string

    @Column({ type: 'varchar', length: 500 })
    business_type: string

    @Column({ type: 'varchar', length: 255 })
    dica_number: string

    @Column({ type: 'varchar', length: 500 })
    photo: string

    @Column({ type: 'varchar', length: 500 })
    website: string

    @Column({ type: 'text' })
    address: string

    @Column({ type: 'varchar', length: 255 })
    country: string

    @Column({ type: 'varchar', length: 255 })
    timezone: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date

}
