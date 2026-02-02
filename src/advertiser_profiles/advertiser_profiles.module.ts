import { Module } from '@nestjs/common';
import { AdvertiserProfilesService } from './advertiser_profiles.service';
import { AdvertiserProfilesController } from './advertiser_profiles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertiserProfile } from './entities/advertiser_profile.entity';

@Module({
    imports: [
      TypeOrmModule.forFeature([AdvertiserProfile])
    ],
  controllers: [AdvertiserProfilesController],
  providers: [AdvertiserProfilesService],
})
export class AdvertiserProfilesModule {}
