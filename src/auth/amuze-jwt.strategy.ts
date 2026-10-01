import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AmuzeTokenService, type AmuzeJwtPayload } from './amuze-token.service';
import { AdminUserService } from 'src/admin-users/admin-user.service';

/** Admin portal requests: authenticated with the AMUZE admin token handed over at /sso. */
@Injectable()
export class AmuzeJwtStrategy extends PassportStrategy(Strategy, 'amuze-jwt') {
    constructor(
        private readonly amuzeTokenService: AmuzeTokenService,
        private readonly adminUserService: AdminUserService,
    ) {
        const { secret, algorithms, issuer, audience } = amuzeTokenService.verifyOptions;
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // A provider instead of secretOrKey: passport-jwt refuses to start with an empty key,
            // so while AMUZE_JWT_SECRET isn't set the app still boots and AMUZE tokens are just refused.
            secretOrKeyProvider: (_request, _rawToken, done) =>
                secret ? done(null, secret) : done(new UnauthorizedException('AMUZE sign-in is not configured')),
            algorithms,
            ...(issuer && { issuer }),
            ...(audience && { audience }),
        });
    }

    // Passport has already checked signature and expiry; here: admin claim and our local admin row.
    async validate(payload: AmuzeJwtPayload) {
        const claims = this.amuzeTokenService.toAdminClaims(payload);
        const admin = await this.adminUserService.findByAmuzeUserId(claims.amuzeUserId);
        if (!admin) {
            throw new UnauthorizedException('Open the Ad portal from the AMUZE admin portal first');
        }
        if (!admin.isActive) {
            throw new UnauthorizedException('Your Ad portal access is disabled');
        }
        // Same shape the rest of the app already uses, so every @Roles('admin') check keeps working.
        return { id: admin.id, email: admin.email, role: 'admin' };
    }
}
