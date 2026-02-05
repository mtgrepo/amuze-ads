import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Advertiser } from "../../advertisers/entities/advertiser.entity";

@Entity("advertiser_posts")
export class AdvertiserPost {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'uuid' })
    advertiser_id: string
    @ManyToOne(() => Advertiser, (advertiser) => advertiser.posts, { onDelete: 'CASCADE' })

    @JoinColumn({ name: 'advertiser_id' })
    advertiser: Advertiser;

    @Column({ type: 'varchar', length: 255 })
    title: string

    @Column({ type: 'text' })
    description: string

    @Column({ type: 'varchar', length: 500 })
    photo: string

    @Column({ type: "varchar", length: 100 })
    status: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

}
