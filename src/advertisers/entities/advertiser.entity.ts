import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Check,
  Index,
} from 'typeorm';
import type { AdvertiserType } from '../advertiser-type';
import { AdvertiserProfile } from '../../advertiser-profile/entities/advertiser-profile.entity';
import { Transactions } from 'src/transactions/entities/transaction.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { Campaign } from 'src/campaigns/entities/campaign.entity';

// Mirrors migration 1790294400000-AddAgencyAccounts so migration:generate sees no drift.
@Entity('advertisers')
@Check('CHK_advertisers_type', `"type" IN ('agency', 'advertiser')`)
@Check('CHK_advertisers_agency_has_no_agency', `NOT ("type" = 'agency' AND "agency_id" IS NOT NULL)`)
@Check('CHK_advertisers_login_credentials', `"agency_id" IS NOT NULL OR ("email" IS NOT NULL AND "password" IS NOT NULL)`)
@Check('CHK_advertisers_points_balance', `"points_balance" >= 0`)
@Index('IDX_advertisers_agency_id', ['agencyId'])
export class Advertiser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  status: string;

  @Column({ type: 'boolean', default: true })
  verified: boolean

  @Column({ type: 'text', name: 'password', nullable: true })
  password: string | null;

  @Column({ type: 'varchar', length: 20, default: 'advertiser' })
  type: AdvertiserType;

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId: string | null;

  // Points wallet (1 point = 1 MMK). Changed only through PointsService, which also writes point_ledger.
  @Column({ type: 'integer', name: 'points_balance', default: 0 })
  pointsBalance: number;

  @ManyToOne(() => Advertiser, (agency) => agency.clients, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id', foreignKeyConstraintName: 'FK_advertisers_agency' })
  agency: Advertiser | null;

  @OneToMany(() => Advertiser, (client) => client.agency)
  clients: Advertiser[];

  @Column({ type: 'timestamp', name: 'last_login', nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => Transactions,
    (transaction) => transaction.advertiser,
  )
  transactions: Transactions[];

  @OneToMany(
    () => Notification,
    (notification) => notification.advertiser,
  )
  notifications: Notification[];
  
  @OneToMany(
    () => AdvertiserProfile,
    (profile) => profile.advertiser, // ✅ relation property
  )
  profiles: AdvertiserProfile[];

  @OneToMany(() => Campaign, (advertiserCampaign) => advertiserCampaign.advertiser)
  campaigns: Campaign[]

}