import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Advertiser } from "src/advertisers/entities/advertiser.entity";
import { PointLedger } from "./entities/point-ledger.entity";
import { PointsService } from "./points.service";
import { PointsController } from "./points.controller";

@Module({
    imports: [TypeOrmModule.forFeature([PointLedger, Advertiser])],
    providers: [PointsService],
    controllers: [PointsController],
    exports: [PointsService],
})
export class PointsModule {}
