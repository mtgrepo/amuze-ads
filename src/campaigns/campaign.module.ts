import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "./entities/campaign.entity";
import { CampaignService } from "./campaign.service";
import { CampaignController } from "./campaign.controller";
import { NotificationModule } from "../notifications/notification.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign]),
    NotificationModule
  ],
  providers: [CampaignService],
  controllers: [CampaignController],
})
export class CampaignModule {}