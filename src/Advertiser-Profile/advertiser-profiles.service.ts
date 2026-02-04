import { Injectable } from '@nestjs/common';
import { CreateAdvertiserProfileDto } from './dto/create-advertiser-profile.dto';
import { UpdateAdvertiserProfileDto } from './dto/update-advertiser-profile.dto';
import { AdvertiserProfile } from './entities/advertiser-profile.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AdvertiserProfilesService {
  constructor(
    @InjectRepository(AdvertiserProfile)
    private advertiserProfileRepository: Repository<AdvertiserProfile>,
  ) {}

  async createAdvertiserProfile(createAdvertiserProfileDto: CreateAdvertiserProfileDto, photoUrl: string): Promise<AdvertiserProfile> {
    try {
        const advertiserProfile = this.advertiserProfileRepository.create({
          ...createAdvertiserProfileDto,
          photo: photoUrl,
        });
        return await this.advertiserProfileRepository.save(advertiserProfile);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findAdvertiserProfiles(): Promise<AdvertiserProfile[]> {
    try {
      const data = await this.advertiserProfileRepository.find();
      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findOne(id: string): Promise<AdvertiserProfile> {
    try {
      const profile = await this.advertiserProfileRepository.findOneBy({ id });
      if (!profile) {
        throw new Error('Advertiser profile not found');
      }
      return profile;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async update(id: string, updateAdvertiserProfileDto: UpdateAdvertiserProfileDto, photoPath?: string): Promise<AdvertiserProfile> {
    try {
      const profile = await this.advertiserProfileRepository.findOneBy({ id });
      if (!profile) {
        throw new Error('Advertiser profile not found');
      }
      Object.assign(profile, updateAdvertiserProfileDto);
      if (photoPath) {
        profile.photo = photoPath;
      }
      return await this.advertiserProfileRepository.save(profile);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async remove(id: string): Promise<AdvertiserProfile> {
    try {
      const profile = await this.advertiserProfileRepository.findOneBy({ id });
      if (!profile) {
        throw new Error('Advertiser profile not found');
      }
      return await this.advertiserProfileRepository.remove(profile);
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
