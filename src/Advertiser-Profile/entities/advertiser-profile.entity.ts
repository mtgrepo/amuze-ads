import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Advertiser } from "../../advertisers/entities/advertiser.entity";

@Entity('advertiser_profiles')
export class AdvertiserProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    advertiser_id: string

    @ManyToOne(() => Advertiser, (advertiser) => advertiser.profiles, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'advertiser_id' })
    advertiser: Advertiser;

    @Column({ type: 'varchar', length: 255 })
    business_name: string

    @Column({ type: 'varchar', length: 255 })
    business_no: string

    @Column({ type: 'varchar', length: 500 })
    business_type: string

    @Column({ type: 'varchar', length: 255 })
    Dica_number: string

    @Column({ type: 'varchar', length: 500 })
    photo: string

    @Column({ type: 'varchar', length: 500 })
    website: string

    @Column({ type: 'text' })
    address: string

}
