import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string, role: string, iat?: number }) {
    // Admins only sign in through AMUZE now (amuze-jwt); an old or forged "admin" token of ours is refused.
    if (payload.role === 'admin') {
      throw new UnauthorizedException();
    }
    // A sign-in from before the last password change no longer works, and neither does one for a deleted account.
    const rows: { password_changed_at: Date | null }[] = await this.dataSource.query(
      'SELECT password_changed_at FROM advertisers WHERE id = $1', [payload.sub],
    );
    if (!rows.length) {
      throw new UnauthorizedException();
    }
    const changedAt = rows[0].password_changed_at;
    // iat is in whole seconds, so compare at that precision: a token issued in the same second still works.
    if (changedAt && (payload.iat ?? 0) < Math.floor(new Date(changedAt).getTime() / 1000)) {
      throw new UnauthorizedException('Your password was changed. Please sign in again.');
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
