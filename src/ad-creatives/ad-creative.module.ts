import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdCreative } from './entities/ad-creative.entity';
import { Ad } from 'src/ads/entities/ad.entity';
import { AdCreativeService } from './ad-creative.service';
import { AdCreativeController } from './ad-creative.controller';
import { AdCreativeOwnershipGuard } from './ad-creative-ownership.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AdCreative, Ad])],
  controllers: [AdCreativeController],
  providers: [AdCreativeService, AdCreativeOwnershipGuard],
})
export class AdCreativeModule {}
