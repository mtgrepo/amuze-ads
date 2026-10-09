import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CampaignExtension } from "./entities/campaign-extension.entity";
import { CampaignExtensionService } from "./campaign-extension.service";
import { CampaignExtensionController } from "./campaign-extension.controller";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { Ad } from "src/ads/entities/ad.entity";
import { AdvertiserModule } from "src/advertisers/advertiser.module";
import { PointsModule } from "src/points/points.module";
import { NotificationModule } from "src/notifications/notification.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([CampaignExtension, Campaign, Ad]),
        AdvertiserModule,
        PointsModule,
        NotificationModule,
    ],
    providers: [CampaignExtensionService],
    controllers: [CampaignExtensionController],
})
export class CampaignExtensionModule {}
