import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('admin-users')
export class AdminUser {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true, name: 'amuze_user_id', nullable: true })
    amuzeUserId: string;

    @Column({ type: 'varchar', length: 255})
    name: string;

    // AMUZE admin tokens carry no email, so admins created through AMUZE sign-in have none.
    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    email: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @Column({ type: 'timestamp', name: 'last_login', nullable: true })
    lastLogin: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}