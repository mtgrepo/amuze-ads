import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectDataSource } from "@nestjs/typeorm";
import { createHash, randomBytes } from "crypto";
import { DataSource, IsNull, MoreThan } from "typeorm";
import { Advertiser } from "src/advertisers/entities/advertiser.entity";
import { comparePassword, hashPassword } from "src/common/utils/password.utils";
import { ActivityService } from "src/activity/activity.service";
import { MailService } from "./mail.service";
import { PasswordResetToken } from "./entities/password-reset-token.entity";

const RESET_LINK_MINUTES = 30;
// More requests than this in an hour are ignored, so the reset form can't be used to flood someone's inbox.
const MAX_RESET_EMAILS_PER_HOUR = 3;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** Changing a password while signed in, and resetting a forgotten one by email. Customers only. */
@Injectable()
export class PasswordService {
    private readonly logger = new Logger(PasswordService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly jwtService: JwtService,
        private readonly mail: MailService,
        private readonly config: ConfigService,
        private readonly activity: ActivityService,
    ) {}

    /**
     * Checks the current password, sets the new one and signs out every other device. Returns a fresh token
     * for this device, because the old one stops working along with the others.
     */
    async change(advertiserId: string, currentPassword: string, newPassword: string): Promise<{ accessToken: string }> {
        return this.dataSource.transaction(async (manager) => {
            const advertiser = await manager.findOne(Advertiser, { where: { id: advertiserId }, lock: { mode: 'pessimistic_write' } });
            if (!advertiser?.password || !(await comparePassword(currentPassword, advertiser.password))) {
                // 400, not 401: the customer portal treats a 401 as an expired session and signs out.
                throw new BadRequestException('Your current password is wrong');
            }
            if (await comparePassword(newPassword, advertiser.password)) {
                throw new BadRequestException('Choose a password different from your current one');
            }
            advertiser.password = await hashPassword(newPassword);
            advertiser.passwordChangedAt = new Date();
            await manager.save(advertiser);
            await this.activity.record(manager, {
                action: 'advertiser.password_changed', entityType: 'advertiser', entityId: advertiser.id, advertiserId: advertiser.id,
                summary: 'Password changed',
            });
            const role = advertiser.type === 'agency' ? 'agency' : 'advertiser';
            return { accessToken: this.jwtService.sign({ sub: advertiser.id, email: advertiser.email, role }) };
        });
    }

    /** Emails a one-time reset link. The email must belong to an account that signs in. */
    async requestReset(email: string): Promise<void> {
        // Accounts made by an admin may have capitals in the email, so match without case.
        const advertiser = await this.dataSource.getRepository(Advertiser).createQueryBuilder('a')
            .where('LOWER(a.email) = :email', { email: email.trim().toLowerCase() })
            .getOne();
        if (!advertiser || !advertiser.email) {
            throw new NotFoundException("There's no account with this email.");
        }
        // Agency clients never sign in, so they have nothing to reset.
        if (advertiser.agencyId || !advertiser.password) {
            throw new BadRequestException("This account doesn't sign in. Ask the agency that manages it.");
        }

        const recent = await this.dataSource.getRepository(PasswordResetToken).count({
            where: { advertiserId: advertiser.id, createdAt: MoreThan(new Date(Date.now() - 60 * 60_000)) },
        });
        if (recent >= MAX_RESET_EMAILS_PER_HOUR) {
            this.logger.warn(`Reset email limit reached for advertiser ${advertiser.id}`);
            throw new HttpException('Too many reset emails for this account. Please try again in an hour.', HttpStatus.TOO_MANY_REQUESTS);
        }

        const token = randomBytes(32).toString('base64url');
        await this.dataSource.transaction(async (manager) => {
            // Only the newest link works.
            await manager.update(PasswordResetToken, { advertiserId: advertiser.id, usedAt: IsNull() }, { usedAt: new Date() });
            await manager.save(manager.create(PasswordResetToken, {
                advertiserId: advertiser.id,
                tokenHash: sha256(token),
                expiresAt: new Date(Date.now() + RESET_LINK_MINUTES * 60_000),
            }));
        });

        // In the fragment, not the query string, so the token never reaches a server log.
        const portal = (this.config.get<string>('CUSTOMER_PORTAL_URL') ?? 'http://localhost:5174').replace(/\/+$/, '');
        const link = `${portal}/reset-password#token=${token}`;
        await this.mail.send(
            advertiser.email,
            'Reset your Amuze Ads password',
            `Hi ${advertiser.name},\n\nSomeone asked to reset the password for your Amuze Ads account. If it was you, set a new one here:\n${link}\n\nThe link works once and expires in ${RESET_LINK_MINUTES} minutes. If you didn't ask for this, you can ignore this email; your password stays the same.\n\nAmuze Ads`,
            `<p>Hi ${escapeHtml(advertiser.name)},</p>
<p>Someone asked to reset the password for your Amuze Ads account. If it was you, set a new one here:</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#3B3FD6;color:#ffffff;border-radius:8px;text-decoration:none">Set a new password</a></p>
<p style="color:#63636B;font-size:13px">The link works once and expires in ${RESET_LINK_MINUTES} minutes. If you didn't ask for this, you can ignore this email; your password stays the same.</p>
<p style="color:#63636B;font-size:13px">Amuze Ads</p>`,
        );
    }

    /** Sets a new password from a reset link and signs out every device. */
    async reset(token: string, newPassword: string): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const row = await manager.findOne(PasswordResetToken, { where: { tokenHash: sha256(token) }, lock: { mode: 'pessimistic_write' } });
            if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
                throw new BadRequestException('This reset link has expired or was already used. Ask for a new one.');
            }
            const advertiser = await manager.findOne(Advertiser, { where: { id: row.advertiserId } });
            if (!advertiser) throw new UnauthorizedException();

            advertiser.password = await hashPassword(newPassword);
            advertiser.passwordChangedAt = new Date();
            await manager.save(advertiser);
            row.usedAt = new Date();
            await manager.save(row);
            await this.activity.record(manager, {
                action: 'advertiser.password_reset', entityType: 'advertiser', entityId: advertiser.id, advertiserId: advertiser.id,
                summary: 'Password reset from an email link',
                actor: { type: 'advertiser', id: advertiser.id },
            });
        });
    }
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
