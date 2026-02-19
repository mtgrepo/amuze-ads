import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminUserService } from 'src/admin-users/admin-user.service';
import { AdvertiserService } from 'src/advertisers/advertiser.service';
import { comparePassword } from 'src/common/utils/password.utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly advertiserUserService: AdvertiserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.adminUserService.findAdminUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        role: "Admin",
        name: user.name,
        email: user.email,
      },
    };
  }

  async advertiserLogin(email: string, password: string) {
    try {
      const user = await this.advertiserUserService.findAdvertiserByEmail(email);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if(!user?.verified || user.status === 'inactive'){
        throw new UnauthorizedException('User Not Found!');
      }

      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { sub: user.id, email: user.email };
      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: user.id,
          role: "Advertiser",
          name: user.name,
          email: user.email,
        },
      };
    } catch (error) {
      throw new UnauthorizedException(error.message)
    }
  }

}
