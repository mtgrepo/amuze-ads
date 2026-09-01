import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ForbiddenException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { AdvertiserPostsService } from './advertiser-posts.service';
import { AdvertiserPostOwnershipGuard } from './advertiser-post-ownership.guard';
import { CreateAdvertiserPostDto } from './dto/create-advertiser-post.dto';
import { UpdateAdvertiserPostDto } from './dto/update-advertiser-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';
import { MinioService } from '../minio/minio.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@UseGuards(JwtAuthGuard)
@Controller('advertiser-posts')
export class AdvertiserPostsController {
  constructor(
    private readonly advertiserPostsService: AdvertiserPostsService,
    private readonly minioService: MinioService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  async create(
    @Body() createAdvertiserPostDto: CreateAdvertiserPostDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const folder = `advertiser-posts/${createAdvertiserPostDto.title}`;
    const fileName = await this.minioService.upload(file, folder);

    const advertiserPost = await this.advertiserPostsService.create(
      {
        ...createAdvertiserPostDto,
        advertiser_id: user.role === 'admin' ? createAdvertiserPostDto.advertiser_id : user.id,
      },
      fileName,
    );

    return {
      data: advertiserPost,
      message: 'Advertiser post created successfully',
    };
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query('advertiser_id') advertiser_id?: string) {
    const posts = await this.advertiserPostsService.findAll(
      user.role === 'admin' ? advertiser_id : user.id,
    );

    return {
      data: posts,
      message: 'Advertiser posts retrieved successfully',
    };
  }

  @UseGuards(AdvertiserPostOwnershipGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const post = await this.advertiserPostsService.findOne(id);

    return {
      data: post,
      message: 'Advertiser post retrieved successfully',
    };
  }

  @Get('advertiser/:id')
  async findByAdvertiser(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    if (user.role !== 'admin' && id !== user.id) {
      throw new ForbiddenException('You do not have permission to access these posts');
    }

    const posts = await this.advertiserPostsService.findByAdvertiserId(id);

    return {
      data: posts,
      message: 'Advertiser posts retrieved successfully',
    };
  }

  @UseGuards(AdvertiserPostOwnershipGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    const updatedPost = await this.advertiserPostsService.updatePostStatus(id, status);

    return {
      data: updatedPost,
      message: 'Advertiser post status updated successfully',
    }
  }

  @UseGuards(AdvertiserPostOwnershipGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  async update(
    @Param('id') id: string,
    @Body() updateAdvertiserPostDto: UpdateAdvertiserPostDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let newPhotoPath: string | undefined;

    if (file) {
      const oldPost = await this.advertiserPostsService.findOne(id);
      if (oldPost.photo) {
        await this.minioService.delete(oldPost.photo);
      }
      const folder = `advertiser-posts/${updateAdvertiserPostDto.title}`;
      newPhotoPath = await this.minioService.upload(file, folder);
    }
    const updatePost = await this.advertiserPostsService.update(
      id,
      updateAdvertiserPostDto,
      newPhotoPath,
    );

    return {
      data: updatePost,
      message: 'Advertiser post updated successfully',
    };
  }

  @UseGuards(AdvertiserPostOwnershipGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const post = await this.advertiserPostsService.findOne(id);

    if (post.photo) {
      await this.minioService.delete(post.photo);
    }
    await this.advertiserPostsService.remove(id);
    return {
      data: post,
      message: 'Advertiser post deleted successfully',
    };
  }
}
