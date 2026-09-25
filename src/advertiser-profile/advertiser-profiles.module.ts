import { Module } from '@nestjs/common';
import { AdvertiserProfilesService } from './advertiser-profiles.service';
import { AdvertiserProfilesController } from './advertiser-profiles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertiserProfile } from './entities/advertiser-profile.entity';
import { AdvertiserModule } from 'src/advertisers/advertiser.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([AdvertiserProfile]),
      AdvertiserModule,
    ],
  controllers: [AdvertiserProfilesController],
  providers: [AdvertiserProfilesService],
})
export class AdvertiserProfilesModule {}
