import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Not behind JwtAuthGuard: on an admin's first visit their local row doesn't exist yet.
  @Post('admin/sso')
  async adminSso(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing AMUZE token');
    }
    return this.authService.adminSso(token);
  }

  @Post('advertiser/login')
  async advertiserLogin(@Body() loginDto: LoginDTO) {
    return this.authService.advertiserLogin(loginDto.email, loginDto.password);
  }

}
