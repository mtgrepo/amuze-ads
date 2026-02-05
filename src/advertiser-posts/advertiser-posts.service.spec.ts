import { Test, TestingModule } from '@nestjs/testing';
import { AdvertiserPostsService } from './advertiser-posts.service';

describe('AdvertiserPostsService', () => {
  let service: AdvertiserPostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdvertiserPostsService],
    }).compile();

    service = module.get<AdvertiserPostsService>(AdvertiserPostsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
