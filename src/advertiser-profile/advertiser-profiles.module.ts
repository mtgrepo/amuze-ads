import { Module } from '@nestjs/common';
import { AdvertiserProfilesService } from './advertiser-profiles.service';
import { AdvertiserProfilesController } from './advertiser-profiles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertiserProfile } from './entities/advertiser-profile.entity';

@Module({
    imports: [
      TypeOrmModule.forFeature([AdvertiserProfile])
    ],
  controllers: [AdvertiserProfilesController],
  providers: [AdvertiserProfilesService],
})
export class AdvertiserProfilesModule {}
