import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdvertiserProfilesService } from './advertiser-profiles.service';
import { CreateAdvertiserProfileDto } from './dto/create-advertiser-profile.dto';
import { UpdateAdvertiserProfileDto } from './dto/update-advertiser-profile.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { MinioService } from 'src/minio/minio.service';

@UseGuards(JwtAuthGuard)
@Controller('advertiser-profiles')
export class AdvertiserProfilesController {
  constructor(
    private readonly advertiserProfilesService: AdvertiserProfilesService,
    private readonly minioService: MinioService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  async create(
    @Body() createAdvertiserProfileDto: CreateAdvertiserProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
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
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let newPhotoPath: string | undefined;

    if (file) {
      const oldProfile = await this.advertiserProfilesService.findOne(id);
      if (oldProfile.photo) {
        await this.minioService.delete(oldProfile.photo);
      }
      const businessName = updateAdvertiserProfileDto.business_name || oldProfile.business_name;
      const folder = `advertiser-profiles/${businessName}`;
      newPhotoPath = await this.minioService.upload(file, folder);
    }

    const updatedProfile = await this.advertiserProfilesService.update(id, updateAdvertiserProfileDto, newPhotoPath);

    return {
      data: updatedProfile,
      message: 'Advertiser profile updated successfully',
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const profile = await this.advertiserProfilesService.findOne(id);

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
