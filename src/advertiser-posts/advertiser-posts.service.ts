import { Injectable } from '@nestjs/common';
import { CreateAdvertiserPostDto } from './dto/create-advertiser-post.dto';
import { UpdateAdvertiserPostDto } from './dto/update-advertiser-post.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AdvertiserPost } from './entities/advertiser-post.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AdvertiserPostsService {
  constructor(
    @InjectRepository(AdvertiserPost)
    private advertiserPostRepository: Repository<AdvertiserPost>,
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
