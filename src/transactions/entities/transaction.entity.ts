import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Advertiser } from "src/advertisers/entities/advertiser.entity";

@Entity('transactions')
export class Transactions {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'advertiser_id' })
    advertiserId: string;
    
    @Column({ type: 'varchar', length: 255, name: 'payment_method' })
    paymentMethod: string;

    @Column({ type: 'integer' })
    amount: number;

    @Column({ type: 'varchar', length: 255, name: 'reference_type' })
    referenceType: string;

    @Column({ type: 'varchar', length: 255, name: 'reference_id' })
    referenceId: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => Advertiser, (advertiser) => advertiser.transactions, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'advertiser_id' })
    advertiser: Advertiser;

}