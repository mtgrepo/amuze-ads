import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

// AMUZE admin roles allowed into the Ad portal. TODO: confirm with the AMUZE team.
// This check is what keeps AMUZE app-user tokens out (the tokens have no issuer/audience).
const ADMIN_ROLE_IDS = [1, 2, 3];

/** Payload of an AMUZE admin JWT. */
export interface AmuzeJwtPayload {
    id: number;
    uuid: string;
    name: string;
    phone_no: string | null;
    profile?: string | null;
    role_id: number;
    session?: string;
    type?: string;
    iat: number;
    exp: number;
}

export interface AmuzeAdminClaims {
    amuzeUserId: string;
    name: string;
    phone: string | null;
}

export interface AmuzeVerifyOptions {
    // Empty until AMUZE_JWT_SECRET is configured; AMUZE tokens are then refused (the app still starts).
    secret: string;
    algorithms: ['HS256'];
    issuer?: string;
    audience?: string;
}

/** Verifies AMUZE admin JWTs (HS256) and reads the admin identity from them. Never log the token. */
@Injectable()
export class AmuzeTokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) {}

    /** Shared by the passport strategy and the SSO endpoint so both check exactly the same things. */
    get verifyOptions(): AmuzeVerifyOptions {
        const issuer = this.config.get<string>('AMUZE_JWT_ISSUER') || undefined;
        const audience = this.config.get<string>('AMUZE_JWT_AUDIENCE') || undefined;
        return {
            secret: this.config.get<string>('AMUZE_JWT_SECRET') ?? '',
            // Only HS256: never "none" or any other algorithm.
            algorithms: ['HS256'],
            ...(issuer && { issuer }),
            ...(audience && { audience }),
        };
    }

    /** Checks signature and expiry (and issuer/audience if AMUZE ever adds them). */
    verify(token: string): AmuzeJwtPayload {
        const { secret, algorithms, issuer, audience } = this.verifyOptions;
        if (!secret) {
            throw new UnauthorizedException('AMUZE sign-in is not configured');
        }
        try {
            return this.jwtService.verify<AmuzeJwtPayload>(token, {
                secret,
                algorithms,
                ...(issuer && { issuer }),
                ...(audience && { audience }),
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired AMUZE token');
        }
    }

    /** Reads the admin identity from a verified payload; rejects tokens that aren't an allowed admin role. */
    toAdminClaims(payload: AmuzeJwtPayload): AmuzeAdminClaims {
        if (!ADMIN_ROLE_IDS.includes(Number(payload.role_id))) {
            throw new UnauthorizedException('Not an AMUZE admin');
        }
        if (payload.id === undefined || payload.id === null) {
            throw new UnauthorizedException('AMUZE token is missing the user id');
        }
        return {
            amuzeUserId: String(payload.id),
            name: payload.name,
            phone: payload.phone_no ?? null,
        };
    }
}
