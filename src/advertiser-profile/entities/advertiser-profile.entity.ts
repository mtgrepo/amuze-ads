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

    // Required for agencies only; enforced in the services, since it depends on the account type.
    @Column({ type: 'varchar', length: 255, nullable: true })
    dica_number: string | null

    @Column({ type: 'varchar', length: 500, nullable: true })
    photo: string | null

    @Column({ type: 'varchar', length: 500, nullable: true })
    website: string | null

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
