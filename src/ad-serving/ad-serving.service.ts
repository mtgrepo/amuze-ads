import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Ad } from "src/ads/entities/ad.entity";
import { DailyAdStatsService } from "src/daily-ad-stats/daily-ad-stats.service";
import { ObjectivePacingService } from "src/campaign-objectives/objective-pacing.service";

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
    private readonly dailyAdStatsService: DailyAdStatsService,
    private readonly pacingService: ObjectivePacingService,
  ) {}

  /** Weighted random pick: ads behind on a bought objective get a bigger share (see ObjectivePacingService). */
  private pickWeighted(candidates: Ad[]): Ad | null {
    if (candidates.length === 0) return null;
    const weights = candidates.map((ad) => this.pacingService.weightFor(ad.id));
    let roll = Math.random() * weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll < 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

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

    const candidate = this.pickWeighted(await qb.getMany());
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

  async trackEvent(adId: string, event: string): Promise<void> {
    await this.dailyAdStatsService.trackEvent(adId, event);
  }
}
