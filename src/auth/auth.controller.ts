import { BadRequestException, Body, Controller, Headers, Post, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { AdvertiserService } from 'src/advertisers/advertiser.service';
import { RegisterAdvertiserDTO } from 'src/advertisers/dto/register-advertiser.dto';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly advertiserService: AdvertiserService,
  ) {}

  // Not behind JwtAuthGuard: on an admin's first visit their local row doesn't exist yet.
  @Post('admin/sso')
  async adminSso(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing AMUZE token');
    }
    return this.authService.adminSso(token);
  }

  /** Self-registration from the customer portal: account + business profile, optional logo. */
  @Post('advertiser/register')
  @UseInterceptors(FileInterceptor('photo', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_LOGO_BYTES },
    fileFilter: (_req, file, done) =>
      file.mimetype.startsWith('image/') ? done(null, true) : done(new BadRequestException('The logo must be an image'), false),
  }))
  async advertiserRegister(@Body() dto: RegisterAdvertiserDTO, @UploadedFile() photo?: Express.Multer.File) {
    const advertiser = await this.advertiserService.register(dto, photo);
    return { data: advertiser, message: 'Registration received' };
  }

  @Post('advertiser/login')
  async advertiserLogin(@Body() loginDto: LoginDTO) {
    return this.authService.advertiserLogin(loginDto.email, loginDto.password);
  }

}
