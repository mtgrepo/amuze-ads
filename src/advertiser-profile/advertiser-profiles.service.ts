import { Injectable } from '@nestjs/common';
import { CreateAdvertiserProfileDto } from './dto/create-advertiser-profile.dto';
import { UpdateAdvertiserProfileDto } from './dto/update-advertiser-profile.dto';
import { AdvertiserProfile } from './entities/advertiser-profile.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

// The only fields a request may set. The body is unwhitelisted, so copying it whole
// would let `id` or `advertiser` retarget the save to another profile or advertiser.
const PROFILE_FIELDS = ['business_name', 'business_no', 'business_type', 'dica_number', 'website', 'address', 'country', 'timezone'] as const;

function pickProfileFields(dto: Partial<CreateAdvertiserProfileDto>): Partial<AdvertiserProfile> {
  const picked: Partial<AdvertiserProfile> = {};
  for (const key of PROFILE_FIELDS) {
    if (dto[key] !== undefined) picked[key] = dto[key];
  }
  return picked;
}

@Injectable()
export class AdvertiserProfilesService {
  constructor(
    @InjectRepository(AdvertiserProfile)
    private advertiserProfileRepository: Repository<AdvertiserProfile>,
  ) {}

  async createAdvertiserProfile(createAdvertiserProfileDto: CreateAdvertiserProfileDto, photoUrl: string): Promise<AdvertiserProfile> {
    try {
        const advertiserProfile = this.advertiserProfileRepository.create({
          ...pickProfileFields(createAdvertiserProfileDto),
          advertiser_id: createAdvertiserProfileDto.advertiser_id,
          photo: photoUrl,
        });
        return await this.advertiserProfileRepository.save(advertiserProfile);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findAdvertiserProfiles(): Promise<AdvertiserProfile[]> {
    try {

      const data = await this.advertiserProfileRepository
      .createQueryBuilder('profile')
      .leftJoin('profile.advertiser', 'advertiser')
      .addSelect(['advertiser.id', 'advertiser.name', 'advertiser.email'])
      .getMany();
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
      Object.assign(profile, pickProfileFields(updateAdvertiserProfileDto));
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
