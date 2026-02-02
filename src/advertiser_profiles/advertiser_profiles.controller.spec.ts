import { Test, TestingModule } from '@nestjs/testing';
import { AdvertiserProfilesController } from './advertiser_profiles.controller';
import { AdvertiserProfilesService } from './advertiser_profiles.service';

describe('AdvertiserProfilesController', () => {
  let controller: AdvertiserProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvertiserProfilesController],
      providers: [AdvertiserProfilesService],
    }).compile();

    controller = module.get<AdvertiserProfilesController>(AdvertiserProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
