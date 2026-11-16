import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Advertiser } from "src/advertisers/entities/advertiser.entity";

/**
 * A "forgot password" link. Only a SHA-256 hash of the token is stored, so a database leak can't be used to
 * reset anyone's password. Valid once, for a short time.
 */
@Entity('password_reset_tokens')
@Index(['advertiserId', 'createdAt'])
export class PasswordResetToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'advertiser_id' })
    advertiserId: string;

    @ManyToOne(() => Advertiser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'advertiser_id' })
    advertiser: Advertiser;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 64, name: 'token_hash' })
    tokenHash: string;

    @Column({ type: 'timestamptz', name: 'expires_at' })
    expiresAt: Date;

    @Column({ type: 'timestamptz', name: 'used_at', nullable: true })
    usedAt: Date | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;
}
