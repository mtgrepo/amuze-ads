import { ForbiddenException, HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminUserService } from 'src/admin-users/admin-user.service';
import { AdvertiserService } from 'src/advertisers/advertiser.service';
import { comparePassword } from 'src/common/utils/password.utils';
import { AmuzeTokenService } from './amuze-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly advertiserUserService: AdvertiserService,
    private readonly jwtService: JwtService,
    private readonly amuzeTokenService: AmuzeTokenService,
  ) {}

  /**
   * Called once when an admin arrives from the AMUZE admin portal: verify the AMUZE token,
   * then create/update the local admin. The portal keeps using the AMUZE token for API calls.
   */
  async adminSso(token: string) {
    const claims = this.amuzeTokenService.toAdminClaims(this.amuzeTokenService.verify(token));
    const admin = await this.adminUserService.upsertFromAmuze(claims);
    if (!admin.isActive) {
      throw new UnauthorizedException('Your Ad portal access is disabled');
    }
    return {
      user: {
        id: admin.id,
        role: 'Admin',
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
      },
    };
  }

  async advertiserLogin(email: string, password: string) {
    try {
      const user = await this.advertiserUserService.findAdvertiserByEmail(email);

      if (!user) {
        throw new NotFoundException('Invalid credentials');
      }

      // Agency clients are managed by their agency and never log in.
      if (!user.password || user.agencyId) {
        throw new NotFoundException('Invalid credentials');
      }

      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new NotFoundException('Invalid credentials');
      }

      // Checked only after the password, so account status isn't revealed to someone guessing emails.
      // 403 rather than 401: the customer portal treats any 401 as an expired session and reloads.
      if (user.status === 'inactive') {
        throw new ForbiddenException('Your account has been disabled. Please contact Amuze.');
      }
      if (!user.verified) {
        throw new ForbiddenException('Your account is not verified yet. Amuze will review it and let you know.');
      }

      const role = user.type === 'agency' ? 'agency' : 'advertiser';
      const payload = { sub: user.id, email: user.email, role };
      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: user.id,
          role: role === 'agency' ? 'Agency' : 'Advertiser',
          type: user.type,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new NotFoundException(error.message)
    }
  }

}
