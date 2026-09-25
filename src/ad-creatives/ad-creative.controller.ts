import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdCreativeService } from './ad-creative.service';
import { AdCreativeOwnershipGuard } from './ad-creative-ownership.guard';
import { CreateAdCreativeDto } from './dto/create-ad-creative.dto';
import { UpdateAdCreativeDto } from './dto/update-ad-creative.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import type { CurrentUserPayload } from 'src/auth/current-user.decorator';
import { MinioService } from 'src/minio/minio.service';
import { AdvertiserService } from 'src/advertisers/advertiser.service';

@UseGuards(JwtAuthGuard)
@Controller('ad-creatives')
export class AdCreativeController {
  constructor(
    private readonly adCreativeService: AdCreativeService,
    private readonly minioService: MinioService,
    private readonly advertiserService: AdvertiserService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('asset', { storage: memoryStorage() }))
  async create(
    @Body() dto: CreateAdCreativeDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const advertiserId = await this.advertiserService.resolveTargetAdvertiserId(user, dto.advertiserId);
    const folder = `ad-creatives/${advertiserId}`;
    const assetPath = await this.minioService.upload(file, folder);

    const creative = await this.adCreativeService.create({ ...dto, advertiserId }, assetPath);

    return {
      data: creative,
      message: 'Ad creative created successfully',
    };
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query('advertiserId') advertiserId?: string) {
    const creatives = await this.adCreativeService.findAll(await this.advertiserService.resolveListScope(user, advertiserId));
    return {
      data: creatives,
      message: 'Ad creatives retrieved successfully',
    };
  }

  @UseGuards(AdCreativeOwnershipGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const creative = await this.adCreativeService.findOne(id);
    return {
      data: creative,
      message: 'Ad creative retrieved successfully',
    };
  }

  @UseGuards(AdCreativeOwnershipGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('asset', { storage: memoryStorage() }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdCreativeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let assetPath: string | undefined;
    if (file) {
      const existing = await this.adCreativeService.findOne(id);
      await this.minioService.delete(existing.asset);
      assetPath = await this.minioService.upload(file, `ad-creatives/${existing.advertiserId}`);
    }

    const creative = await this.adCreativeService.update(id, dto, assetPath);
    return {
      data: creative,
      message: 'Ad creative updated successfully',
    };
  }

  @UseGuards(AdCreativeOwnershipGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const creative = await this.adCreativeService.findOne(id);
    const removed = await this.adCreativeService.remove(id);
    await this.minioService.delete(creative.asset);
    return {
      data: removed,
      message: 'Ad creative deleted successfully',
    };
  }
}
