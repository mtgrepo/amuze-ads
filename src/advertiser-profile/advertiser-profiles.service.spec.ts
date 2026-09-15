import { Test, TestingModule } from '@nestjs/testing';
import { AdvertiserProfilesService } from './advertiser-profiles.service';

describe('AdvertiserProfilesService', () => {
  let service: AdvertiserProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdvertiserProfilesService],
    }).compile();

    service = module.get<AdvertiserProfilesService>(AdvertiserProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
