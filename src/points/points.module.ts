import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Advertiser } from "src/advertisers/entities/advertiser.entity";
import { PointLedger } from "./entities/point-ledger.entity";
import { PointsService } from "./points.service";

@Module({
    imports: [TypeOrmModule.forFeature([PointLedger, Advertiser])],
    providers: [PointsService],
    exports: [PointsService],
})
export class PointsModule {}
