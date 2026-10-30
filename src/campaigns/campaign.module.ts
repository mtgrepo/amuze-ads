import { Module } from "@nestjs/common";
import { AdPackageModule } from "src/ad-packages/ad-package.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "./entities/campaign.entity";
import { Ad } from "src/ads/entities/ad.entity";
import { CampaignService } from "./campaign.service";
import { CampaignController } from "./campaign.controller";
import { NotificationModule } from "../notifications/notification.module";
import { CampaignOwnershipGuard } from "./campaign-ownership.guard";
import { AdvertiserModule } from "src/advertisers/advertiser.module";
import { PointsModule } from "src/points/points.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Ad]),
    NotificationModule,
    AdvertiserModule,
    PointsModule,
    AdPackageModule,
  ],
  providers: [CampaignService, CampaignOwnershipGuard],
  controllers: [CampaignController],
  exports: [CampaignService],
})
export class CampaignModule {}