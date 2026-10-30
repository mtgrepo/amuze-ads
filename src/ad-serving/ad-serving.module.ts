import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ad } from 'src/ads/entities/ad.entity';
import { DailyAdStatsModule } from 'src/daily-ad-stats/daily-ad-stats.module';
import { AdServingService } from './ad-serving.service';
import { AdServingController } from './ad-serving.controller';
import { ApiKeyGuard } from './api-key.guard';
import { CampaignObjectiveModule } from 'src/campaign-objectives/campaign-objective.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ad]), DailyAdStatsModule, CampaignObjectiveModule],
  controllers: [AdServingController],
  providers: [AdServingService, ApiKeyGuard],
})
export class AdServingModule {}
