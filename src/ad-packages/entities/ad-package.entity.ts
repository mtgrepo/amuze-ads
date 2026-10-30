import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * A time package admins sell, e.g. Daily (1 day) or Monthly (30 days). Customers buy it in whole
 * units: a campaign runs duration_days × quantity days and costs price × quantity points.
 * Packages are never deleted (campaigns reference them), only deactivated.
 */
@Entity('ad_packages')
export class AdPackage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    name: string;

    /** Days one unit covers. */
    @Column({ type: 'integer', name: 'duration_days' })
    durationDays: number;

    /** Points for one unit. 1 point = 1 MMK. */
    @Column({ type: 'integer' })
    price: number;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'boolean', name: 'is_active', default: true })
    isActive: boolean;

    @Column({ type: 'integer', name: 'sort_order', default: 0 })
    sortOrder: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
