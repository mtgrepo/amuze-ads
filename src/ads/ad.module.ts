import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ad } from "./entities/ad.entity";
import { AdSet } from "src/ad-sets/entities/ad-sets.entity";
import { AdService } from "./ad.service";
import { AdController } from "./ad.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Ad, AdSet])
  ],
  providers: [AdService],
  controllers: [AdController]
})
export class AdModule {}
