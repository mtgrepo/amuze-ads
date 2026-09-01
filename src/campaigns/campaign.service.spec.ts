import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CampaignService } from './campaign.service';
import { Campaign } from './entities/campaign.entity';
import { NotificationService } from '../notifications/notification.service';
import { TransactionService } from '../transactions/transaction.service';

const makeCampaign = (overrides: Record<string, any>) => ({
  id: 'campaign-1',
  name: 'Test Campaign',
  objective: 'reach',
  dailyBudget: 1000,
  totalBudget: 7000,
  spentAmount: 0,
  status: 'active',
  advertiserId: 'advertiser-1',
  postId: 'post-1',
  ...overrides,
});

describe('CampaignService', () => {
  let service: CampaignService;
  let campaignRepository: { find: jest.Mock; findOneBy: jest.Mock; save: jest.Mock };
  let notificationService: { createNotification: jest.Mock };
  let transactionService: { findByReferenceIds: jest.Mock; findByReferenceId: jest.Mock };

  beforeEach(async () => {
    campaignRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn((campaign) => Promise.resolve(campaign)),
    };
    notificationService = { createNotification: jest.fn() };
    transactionService = {
      findByReferenceIds: jest.fn().mockResolvedValue([]),
      findByReferenceId: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: getRepositoryToken(Campaign), useValue: campaignRepository },
        { provide: NotificationService, useValue: notificationService },
        { provide: TransactionService, useValue: transactionService },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  describe('autoStopCampaigns', () => {
    it('completes a campaign once spentAmount reaches totalBudget exactly', async () => {
      const campaign = makeCampaign({ id: 'c-1', spentAmount: 7000, totalBudget: 7000 });
      campaignRepository.find.mockResolvedValue([campaign]);
      campaignRepository.findOneBy.mockResolvedValue(campaign);

      await service.autoStopCampaigns();

      expect(campaignRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c-1', status: 'completed' }),
      );
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ advertiserId: 'advertiser-1' }),
      );
    });

    it('completes a campaign once spentAmount exceeds totalBudget', async () => {
      const campaign = makeCampaign({ id: 'c-2', spentAmount: 8000, totalBudget: 7000 });
      campaignRepository.find.mockResolvedValue([campaign]);
      campaignRepository.findOneBy.mockResolvedValue(campaign);

      await service.autoStopCampaigns();

      expect(campaignRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c-2', status: 'completed' }),
      );
    });

    it('leaves a campaign untouched while spentAmount is below totalBudget', async () => {
      const campaign = makeCampaign({ id: 'c-3', spentAmount: 3000, totalBudget: 7000 });
      campaignRepository.find.mockResolvedValue([campaign]);

      await service.autoStopCampaigns();

      expect(campaignRepository.findOneBy).not.toHaveBeenCalled();
      expect(campaignRepository.save).not.toHaveBeenCalled();
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('only completes the campaigns that reached budget, in a mixed batch', async () => {
      const under = makeCampaign({ id: 'c-under', spentAmount: 1000, totalBudget: 7000 });
      const over = makeCampaign({ id: 'c-over', spentAmount: 7500, totalBudget: 7000 });
      campaignRepository.find.mockResolvedValue([under, over]);
      campaignRepository.findOneBy.mockImplementation(({ id }: { id: string }) =>
        Promise.resolve(id === 'c-over' ? over : under),
      );

      await service.autoStopCampaigns();

      expect(campaignRepository.save).toHaveBeenCalledTimes(1);
      expect(campaignRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c-over', status: 'completed' }),
      );
    });
  });
});
