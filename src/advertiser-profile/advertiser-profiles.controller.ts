import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdvertiserProfilesService } from './advertiser-profiles.service';
import { CreateAdvertiserProfileDto } from './dto/create-advertiser-profile.dto';
import { UpdateAdvertiserProfileDto } from './dto/update-advertiser-profile.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { MinioService } from 'src/minio/minio.service';
import { CurrentUser } from 'src/auth/current-user.decorator';
import type { CurrentUserPayload } from 'src/auth/current-user.decorator';
import { AdvertiserService } from 'src/advertisers/advertiser.service';

@UseGuards(JwtAuthGuard)
@Controller('advertiser-profiles')
export class AdvertiserProfilesController {
  constructor(
    private readonly advertiserProfilesService: AdvertiserProfilesService,
    private readonly minioService: MinioService,
    private readonly advertiserService: AdvertiserService,
  ) {}

  private async assertCanManage(user: CurrentUserPayload, advertiserId: string) {
    if (!(await this.advertiserService.canManageAccount(user, advertiserId))) {
      throw new ForbiddenException('You do not have permission to manage this business profile');
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  async create(
    @Body() createAdvertiserProfileDto: CreateAdvertiserProfileDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.assertCanManage(user, createAdvertiserProfileDto.advertiser_id);

    const folder = `advertiser-profiles/${createAdvertiserProfileDto.business_name}`;
    const fileName = await this.minioService.upload(file, folder);

    const advertiserProfile = await this.advertiserProfilesService.createAdvertiserProfile(
      createAdvertiserProfileDto,
      fileName,
    );

    return {
      data: advertiserProfile,
      message: 'Advertiser profile created successfully',
    };
  }

  @Get()
  async findAll() {
    const profiles = await this.advertiserProfilesService.findAdvertiserProfiles();

    return {
      data: profiles,
      message: 'Advertiser profiles retrieved successfully',
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const profile = await this.advertiserProfilesService.findOne(id);

    return {
      data: profile,
      message: 'Advertiser profile retrieved successfully',
    }
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  async update(
    @Param('id') id: string,
    @Body() updateAdvertiserProfileDto: UpdateAdvertiserProfileDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const existing = await this.advertiserProfilesService.findOne(id);
    await this.assertCanManage(user, existing.advertiser_id);
    const { advertiser_id: _advertiserId, ...profileUpdate } = updateAdvertiserProfileDto;

    let newPhotoPath: string | undefined;

    if (file) {
      if (existing.photo) {
        await this.minioService.delete(existing.photo);
      }
      const businessName = profileUpdate.business_name || existing.business_name;
      const folder = `advertiser-profiles/${businessName}`;
      newPhotoPath = await this.minioService.upload(file, folder);
    }

    const updatedProfile = await this.advertiserProfilesService.update(id, profileUpdate, newPhotoPath);

    return {
      data: updatedProfile,
      message: 'Advertiser profile updated successfully',
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const profile = await this.advertiserProfilesService.findOne(id);
    await this.assertCanManage(user, profile.advertiser_id);

    if (profile.photo) {
      await this.minioService.delete(profile.photo);
    }

    await this.advertiserProfilesService.remove(id);

    return {
      data: profile,
      message: 'Advertiser profile deleted successfully',
    };
  }
}
