import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

/**
 * Sample Config Data:
 *
 * // Pricing - Reach (CPM)
 * {
 *   category: "pricing",
 *   configKey: "reach",
 *   configValue: {
 *     mode: "CPM",
 *     rate: 1500,
 *     currency: "MMK",
 *     unit: 1000,
 *     unitLabel: "impressions"
 *   },
 *   description: "Cost per 1000 impressions for Reach objective",
 *   isActive: true
 * }
 *
 * // Pricing - Traffic (CPC)
 * {
 *   category: "pricing",
 *   configKey: "traffic",
 *   configValue: {
 *     mode: "CPC",
 *     rate: 200,
 *     currency: "MMK",
 *     unit: 1,
 *     unitLabel: "click"
 *   },
 *   description: "Cost per click for Traffic objective",
 *   isActive: true
 * }
 *
 * // Pricing - Engagement (CPE)
 * {
 *   category: "pricing",
 *   configKey: "engagement",
 *   configValue: {
 *     mode: "CPE",
 *     rate: 120,
 *     currency: "MMK",
 *     unit: 1,
 *     unitLabel: "engagement"
 *   },
 *   description: "Cost per engagement for Engagement objective",
 *   isActive: true
 * }
 *
 * // Tax - Commercial Tax
 * {
 *   category: "tax",
 *   configKey: "commercial_tax",
 *   configValue: {
 *     rate: 0.05,
 *     type: "percentage"
 *   },
 *   description: "5% commercial tax on ad spend",
 *   isActive: true
 * }
 *
 * // Limits - Max Daily Budget
 * {
 *   category: "limits",
 *   configKey: "max_daily_budget",
 *   configValue: {
 *     amount: 10000000,
 *     currency: "MMK"
 *   },
 *   description: "Maximum daily budget per campaign",
 *   isActive: true
 * }
 */

@Entity('system_configs')
@Unique(['category', 'configKey'])
export class SystemConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    category: string;

    @Column({ type: 'varchar', length: 100, name: 'config_key' })
    configKey: string;

    @Column({ type: 'jsonb', name: 'config_value' })
    configValue: Record<string, any>;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'boolean', name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
