import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdvertiserAdStats } from "./entities/daily-ad-stats.entity";
import { DailyAdStatsService } from "./daily-ad-stats.service";
import { DailyAdStatsController } from "./daily-ad-stats.controller";
import { Ad } from "src/ads/entities/ad.entity";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { AdvertiserModule } from "src/advertisers/advertiser.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([AdvertiserAdStats, Ad, Campaign]),
        AdvertiserModule,
    ],
    providers: [DailyAdStatsService],
    controllers: [DailyAdStatsController],
    exports: [DailyAdStatsService]
})
export class DailyAdStatsModule {}
