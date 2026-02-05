import { Advertiser } from "src/advertisers/entities/advertiser.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    advertiserId: string

    @ManyToOne(() => Advertiser, (advertiser) => advertiser.notifications, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'advertiser_id' })
    advertiser: Advertiser;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({ type: 'boolean', default: false })
    read: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

}