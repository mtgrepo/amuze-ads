import { Test, TestingModule } from '@nestjs/testing';
import { AdvertiserPostsController } from './advertiser-posts.controller';
import { AdvertiserPostsService } from './advertiser-posts.service';

describe('AdvertiserPostsController', () => {
  let controller: AdvertiserPostsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvertiserPostsController],
      providers: [AdvertiserPostsService],
    }).compile();

    controller = module.get<AdvertiserPostsController>(AdvertiserPostsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
