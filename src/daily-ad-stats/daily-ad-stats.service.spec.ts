import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DailyAdStatsService } from './daily-ad-stats.service';
import { AdvertiserAdStats } from './entities/daily-ad-stats.entity';
import { Ad } from 'src/ads/entities/ad.entity';
import { Campaign } from 'src/campaigns/entities/campaign.entity';
import { SystemConfigsService } from 'src/system-configs/system-configs.service';

const pricingConfigs = [
  { configKey: 'reach', configValue: { mode: 'CPM', rate: 1500, unit: 1000 } },
  { configKey: 'traffic', configValue: { mode: 'CPC', rate: 200, unit: 1 } },
  { configKey: 'engagement', configValue: { mode: 'CPE', rate: 120, unit: 1 } },
];

const makeAd = (id: string, campaign: Record<string, any>) => ({
  id,
  status: 'active',
  adSet: {
    id: `adset-${id}`,
    campaign: {
      id: 'campaign-1',
      objective: 'reach',
      dailyBudget: 10000,
      spentAmount: 0,
      status: 'active',
      ...campaign,
    },
  },
});

describe('DailyAdStatsService', () => {
  let service: DailyAdStatsService;
  let mockQueryBuilder: { innerJoinAndSelect: jest.Mock; where: jest.Mock; andWhere: jest.Mock; getMany: jest.Mock };
  let adRepository: { createQueryBuilder: jest.Mock };
  let advertiserAdStatsRepository: { create: jest.Mock; save: jest.Mock };
  let campaignRepository: { save: jest.Mock };
  let systemConfigsService: { getByCategory: jest.Mock };

  beforeEach(async () => {
    mockQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    adRepository = { createQueryBuilder: jest.fn(() => mockQueryBuilder) };
    advertiserAdStatsRepository = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };
    campaignRepository = { save: jest.fn().mockResolvedValue(undefined) };
    systemConfigsService = { getByCategory: jest.fn().mockResolvedValue(pricingConfigs) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyAdStatsService,
        { provide: getRepositoryToken(AdvertiserAdStats), useValue: advertiserAdStatsRepository },
        { provide: getRepositoryToken(Ad), useValue: adRepository },
        { provide: getRepositoryToken(Campaign), useValue: campaignRepository },
        { provide: SystemConfigsService, useValue: systemConfigsService },
      ],
    }).compile();

    service = module.get<DailyAdStatsService>(DailyAdStatsService);
  });

  describe('generateDailyAdStats', () => {
    it('computes the CPM daily impression cap from the pricing config', async () => {
      const ad = makeAd('ad-1', { objective: 'reach', dailyBudget: 10000 });
      mockQueryBuilder.getMany.mockResolvedValue([ad]);

      await service.generateDailyAdStats();

      expect(advertiserAdStatsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          adId: 'ad-1',
          pricingMode: 'CPM',
          maxImpressions: 6666,
          maxClicks: 0,
          maxEngagements: 0,
          dailyBudget: 10000,
        }),
      );
    });

    it('computes the CPC daily click cap from the pricing config', async () => {
      const ad = makeAd('ad-2', { objective: 'traffic', dailyBudget: 10000 });
      mockQueryBuilder.getMany.mockResolvedValue([ad]);

      await service.generateDailyAdStats();

      expect(advertiserAdStatsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ adId: 'ad-2', pricingMode: 'CPC', maxClicks: 50, maxImpressions: 0 }),
      );
    });

    it('computes the CPE daily engagement cap from the pricing config', async () => {
      const ad = makeAd('ad-3', { objective: 'engagement', dailyBudget: 10000 });
      mockQueryBuilder.getMany.mockResolvedValue([ad]);

      await service.generateDailyAdStats();

      expect(advertiserAdStatsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ adId: 'ad-3', pricingMode: 'CPE', maxEngagements: 83, maxImpressions: 0 }),
      );
    });

    it('leaves caps at zero and pricingMode null when no pricing config matches the objective', async () => {
      const ad = makeAd('ad-4', { objective: 'unconfigured-objective', dailyBudget: 10000 });
      mockQueryBuilder.getMany.mockResolvedValue([ad]);

      await service.generateDailyAdStats();

      expect(advertiserAdStatsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          adId: 'ad-4',
          pricingMode: null,
          maxImpressions: 0,
          maxClicks: 0,
          maxEngagements: 0,
        }),
      );
    });

    it("increments the campaign's spentAmount by its dailyBudget", async () => {
      const ad = makeAd('ad-5', { id: 'campaign-5', dailyBudget: 4000, spentAmount: 2000 });
      mockQueryBuilder.getMany.mockResolvedValue([ad]);

      await service.generateDailyAdStats();

      expect(campaignRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'campaign-5', spentAmount: 6000 }),
      ]);
    });

    it('deducts budget once per campaign even when it has multiple active ads', async () => {
      const sharedCampaign = { id: 'campaign-shared', dailyBudget: 5000, spentAmount: 2000 };
      const adA = makeAd('ad-a', sharedCampaign);
      const adB = makeAd('ad-b', sharedCampaign);
      mockQueryBuilder.getMany.mockResolvedValue([adA, adB]);

      await service.generateDailyAdStats();

      expect(campaignRepository.save).toHaveBeenCalledTimes(1);
      expect(campaignRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'campaign-shared', spentAmount: 7000 }),
      ]);
    });
  });
});
