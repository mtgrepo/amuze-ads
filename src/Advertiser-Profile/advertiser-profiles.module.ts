import { Module } from '@nestjs/common';
import { AdvertiserProfilesService } from './advertiser-profiles.service';
import { AdvertiserProfilesController } from './advertiser-profiles.controller';
import { AdvertiserProfileOwnershipGuard } from './advertiser-profile-ownership.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertiserProfile } from './entities/advertiser-profile.entity';

@Module({
    imports: [
      TypeOrmModule.forFeature([AdvertiserProfile])
    ],
  controllers: [AdvertiserProfilesController],
  providers: [AdvertiserProfilesService, AdvertiserProfileOwnershipGuard],
})
export class AdvertiserProfilesModule {}
