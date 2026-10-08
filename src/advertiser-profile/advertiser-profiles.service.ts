import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { CreateAdvertiserProfileDto } from './dto/create-advertiser-profile.dto';
import { UpdateAdvertiserProfileDto } from './dto/update-advertiser-profile.dto';
import { AdvertiserProfile } from './entities/advertiser-profile.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Advertiser } from 'src/advertisers/entities/advertiser.entity';

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

  /** DICA is required for agencies (registered companies) only; small advertisers may not have one. */
  private async assertDicaForAgency(advertiserId: string, dicaNumber: string | null | undefined): Promise<void> {
    if (dicaNumber?.trim()) return;
    const owner = await this.advertiserProfileRepository.manager.findOne(Advertiser, {
      where: { id: advertiserId },
      select: ['id', 'type'],
    });
    if (owner?.type === 'agency') {
      throw new BadRequestException('DICA number is required for agencies');
    }
  }

  async createAdvertiserProfile(createAdvertiserProfileDto: CreateAdvertiserProfileDto, photoUrl: string | null): Promise<AdvertiserProfile> {
    await this.assertDicaForAgency(createAdvertiserProfileDto.advertiser_id, createAdvertiserProfileDto.dica_number);
    try {
        const advertiserProfile = this.advertiserProfileRepository.create({
          ...pickProfileFields(createAdvertiserProfileDto),
          advertiser_id: createAdvertiserProfileDto.advertiser_id,
          dica_number: createAdvertiserProfileDto.dica_number?.trim() || null,
          photo: photoUrl,
        });
        return await this.advertiserProfileRepository.save(advertiserProfile);
    } catch (error) {
      if (error instanceof HttpException) throw error;
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
      if (error instanceof HttpException) throw error;
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
      if (error instanceof HttpException) throw error;
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
      await this.assertDicaForAgency(profile.advertiser_id, profile.dica_number);
      if (photoPath) {
        profile.photo = photoPath;
      }
      return await this.advertiserProfileRepository.save(profile);
    } catch (error) {
      if (error instanceof HttpException) throw error;
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
      if (error instanceof HttpException) throw error;
      throw new Error(error.message);
    }
  }
}
