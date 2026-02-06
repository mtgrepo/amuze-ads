import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdvertiserAdStats } from "./entities/daily-ad-stats.entity";
import { DailyAdStatsService } from "./daily-ad-stats.service";
import { DailyAdStatsController } from "./daily-ad-stats.controller";

@Module({
    imports: [
        TypeOrmModule.forFeature([AdvertiserAdStats])
    ],
    providers: [DailyAdStatsService],
    controllers: [DailyAdStatsController],
    exports: [DailyAdStatsService]
})
export class DailyAdStatsModule {}
