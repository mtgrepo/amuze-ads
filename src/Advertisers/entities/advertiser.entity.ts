import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AdvertiserProfile } from '../../advertiser-profile/entities/advertiser-profile.entity';
import { Transactions } from 'src/transactions/entities/transaction.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { Campaign } from 'src/campaigns/entities/campaign.entity';

@Entity('advertisers')
export class Advertiser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  status: string;

  @Column({ type: 'boolean', default: true })
  verified: boolean

  @Column({ type: 'text', name: 'password' })
  password: string;

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