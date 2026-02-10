import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  async login(@Body() loginDto: LoginDTO) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('advertiser/login')
  async advertiserLogin(@Body() loginDto: LoginDTO) {
    return this.authService.advertiserLogin(loginDto.email, loginDto.password);
  }

}
