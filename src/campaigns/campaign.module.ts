import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "./entities/campaign.entity";
import { CampaignService } from "./campaign.service";
import { CampaignController } from "./campaign.controller";
import { NotificationModule } from "../notifications/notification.module";
import { TransactionModule } from "../transactions/transaction.module";
import { CampaignOwnershipGuard } from "./campaign-ownership.guard";

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign]),
    NotificationModule,
    TransactionModule,
  ],
  providers: [CampaignService, CampaignOwnershipGuard],
  controllers: [CampaignController],
  exports: [CampaignService],
})
export class CampaignModule {}