import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Ad } from "src/ads/entities/ad.entity";

export interface ServingCriteria {
  placement: string;
  age?: number;
  gender?: string;
}

export interface ServableAdResult {
  adId: string;
  adType: string;
  placementKey: string;
  creative: { assetType: string; asset: string; destinationLink: string };
}

@Injectable()
export class AdServingService {
  constructor(
    @InjectRepository(Ad)
    private readonly adRepository: Repository<Ad>,
  ) {}

  async findServableAd(criteria: ServingCriteria): Promise<ServableAdResult | null> {
    let qb = this.adRepository
      .createQueryBuilder('ad')
      .innerJoinAndSelect('ad.adSet', 'adSet')
      .innerJoinAndSelect('ad.adCreative', 'adCreative')
      .innerJoin('adSet.campaign', 'campaign')
      .where('ad.status = :adStatus', { adStatus: 'active' })
      .andWhere('campaign.status = :campaignStatus', { campaignStatus: 'active' })
      .andWhere('ad.placementKey = :placement', { placement: criteria.placement });

    if (criteria.age !== undefined) {
      qb = qb.andWhere('adSet.ageMin <= :age AND adSet.ageMax >= :age', { age: criteria.age });
    }
    if (criteria.gender) {
      qb = qb.andWhere("(adSet.gender = 'all' OR adSet.gender = :gender)", { gender: criteria.gender });
    }

    const candidate = await qb.getOne();
    if (!candidate) {
      return null;
    }

    return {
      adId: candidate.id,
      adType: candidate.adType,
      placementKey: candidate.placementKey,
      creative: {
        assetType: candidate.adCreative.assetType,
        asset: candidate.adCreative.asset,
        destinationLink: candidate.adCreative.destinationLink,
      },
    };
  }
}
