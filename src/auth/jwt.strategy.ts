import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string, role: string }) {
    // Admins only sign in through AMUZE now (amuze-jwt); an old or forged "admin" token of ours is refused.
    if (payload.role === 'admin') {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
