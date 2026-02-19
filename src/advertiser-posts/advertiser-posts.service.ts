import { Injectable, NotAcceptableException } from '@nestjs/common';
import { CreateAdvertiserPostDto } from './dto/create-advertiser-post.dto';
import { UpdateAdvertiserPostDto } from './dto/update-advertiser-post.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AdvertiserPost } from './entities/advertiser-post.entity';
import { Repository } from 'typeorm';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class AdvertiserPostsService {
  constructor(
    @InjectRepository(AdvertiserPost)
    private advertiserPostRepository: Repository<AdvertiserPost>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    createAdvertiserPostDto: CreateAdvertiserPostDto,
    photoUrl: string,
  ): Promise<AdvertiserPost> {
    try {
      const advertiserPost = this.advertiserPostRepository.create({
        ...createAdvertiserPostDto,
        photo: photoUrl,
      });
      return await this.advertiserPostRepository.save(advertiserPost);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findAll(advertiser_id?: string): Promise<AdvertiserPost[]> {
    try {
      if (advertiser_id) {
        return await this.advertiserPostRepository.find({
          where: { advertiser_id },
          relations: ['advertiser'],
        });
      }

      return await this.advertiserPostRepository.find({
        relations: ['advertiser'],
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findOne(id: string): Promise<AdvertiserPost> {
    try {
      const data = await this.advertiserPostRepository.findOne({
        where: { id },
        relations: ['advertiser'],
      });
      if (!data) {
        throw new Error('Advertiser post not found');
      }
      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findByAdvertiserId(advertiser_id: string): Promise<AdvertiserPost[]> {
    try {
      const data = await this.advertiserPostRepository.find({
        where: { advertiser_id },
        relations: ['advertiser'],
      });
      if (!data) {
        throw new Error('Advertiser post not found');
      }
      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async update(
    id: string,
    updateAdvertiserPostDto: UpdateAdvertiserPostDto,
    photoPath?: string,
  ): Promise<AdvertiserPost> {
    try {
      const response = await this.advertiserPostRepository.findOneBy({ id });
      if (!response) {
        throw new Error('Advertiser post not found');
      }
      Object.assign(response, updateAdvertiserPostDto);
      if (photoPath) {
        response.photo = photoPath;
      }
      return await this.advertiserPostRepository.save(response);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updatePostStatus (id: string, status: string): Promise<AdvertiserPost>{
    try {
      const response = await this.advertiserPostRepository.findOneBy({ id });
      if (!response) {
        throw new Error('Advertiser post not found');
      }
      response.status = status;
      const postData = await this.advertiserPostRepository.save(response);

      //noti created
      this.notificationService.createNotification({
        advertiserId: postData?.advertiser_id,
        title: "Notification about Post Status",
        message: `Your Post has been ${status} !`
      })
      return postData;
    } catch (error) {
       throw new NotAcceptableException(error.message);
    }
  }

  async remove(id: string): Promise<AdvertiserPost> {
    try {
      const response = await this.advertiserPostRepository.findOneBy({ id });
      if (!response) {
        throw new Error('Advertiser post not found');
      }
      return await this.advertiserPostRepository.remove(response);
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
