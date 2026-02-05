import { Module } from '@nestjs/common';
import { AdvertiserPostsService } from './advertiser-posts.service';
import { AdvertiserPostsController } from './advertiser-posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertiserPost } from './entities/advertiser-post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdvertiserPost]),
  ],
  controllers: [AdvertiserPostsController],
  providers: [AdvertiserPostsService],
})
export class AdvertiserPostsModule {}
