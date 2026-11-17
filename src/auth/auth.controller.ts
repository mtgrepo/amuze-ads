import { BadRequestException, Body, Controller, ForbiddenException, Headers, HttpCode, Post, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { AdvertiserService } from 'src/advertisers/advertiser.service';
import { RegisterAdvertiserDTO } from 'src/advertisers/dto/register-advertiser.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { CurrentUserPayload } from './current-user.decorator';
import { PasswordService } from './password.service';
import { ChangePasswordDTO, ForgotPasswordDTO, ResetPasswordDTO } from './dto/password.dto';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly advertiserService: AdvertiserService,
    private readonly passwordService: PasswordService,
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

  /** Signed-in customer changes their password. Other devices are signed out; this one gets a new token. */
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('advertiser/change-password')
  async changePassword(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangePasswordDTO) {
    if (user.role === 'admin') {
      throw new ForbiddenException('Admins sign in through AMUZE');
    }
    const result = await this.passwordService.change(user.id, dto.currentPassword, dto.newPassword);
    return { data: result, message: 'Password changed' };
  }

  /** "Forgot password?": emails a reset link. Unknown emails get a 404. */
  @HttpCode(200)
  @Post('advertiser/forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDTO) {
    await this.passwordService.requestReset(dto.email);
    return { message: "We've sent a link to reset your password." };
  }

  /** Sets a new password from the emailed link. */
  @HttpCode(200)
  @Post('advertiser/reset-password')
  async resetPassword(@Body() dto: ResetPasswordDTO) {
    await this.passwordService.reset(dto.token, dto.newPassword);
    return { message: 'Password reset. You can sign in with your new password.' };
  }

}
