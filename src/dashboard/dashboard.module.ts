import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { PointLedger } from "src/points/entities/point-ledger.entity";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";

@Module({
    imports: [TypeOrmModule.forFeature([Campaign, PointLedger])],
    providers: [DashboardService],
    controllers: [DashboardController],
})
export class DashboardModule {}
