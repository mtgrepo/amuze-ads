import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { AdvertiserPostsService } from './advertiser-posts.service';
import { CreateAdvertiserPostDto } from './dto/create-advertiser-post.dto';
import { UpdateAdvertiserPostDto } from './dto/update-advertiser-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
  ) {
    const folder = `advertiser-posts/${createAdvertiserPostDto.title}`;
    const fileName = await this.minioService.upload(file, folder);

    const advertiserPost = await this.advertiserPostsService.create(
      createAdvertiserPostDto,
      fileName,
    );

    return {
      data: advertiserPost,
      message: 'Advertiser post created successfully',
    };
  }

  @Get()
  async findAll(@Query('advertiser_id') advertiser_id?: string) {
    const posts = await this.advertiserPostsService.findAll(advertiser_id);

    return {
      data: posts,
      message: 'Advertiser posts retrieved successfully',
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const post = await this.advertiserPostsService.findOne(id);

    return {
      data: post,
      message: 'Advertiser post retrieved successfully',
    };
  }

  @Get('advertiser/:id')
  async findByAdvertiser(@Param('id') id: string) {
    const posts = await this.advertiserPostsService.findByAdvertiserId(id);

    return {
      data: posts,
      message: 'Advertiser posts retrieved successfully',
    };
  }

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
