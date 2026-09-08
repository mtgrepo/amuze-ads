import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ad } from "./entities/ad.entity";
import { AdSet } from "src/ad-sets/entities/ad-sets.entity";
import { AdService } from "./ad.service";
import { AdController } from "./ad.controller";
import { AdOwnershipGuard } from "./ad-ownership.guard";
import { NotificationModule } from "../notifications/notification.module";
import { CampaignModule } from "src/campaigns/campaign.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Ad, AdSet]),
    NotificationModule,
    CampaignModule
  ],
  providers: [AdService, AdOwnershipGuard],
  controllers: [AdController]
})
export class AdModule {}
