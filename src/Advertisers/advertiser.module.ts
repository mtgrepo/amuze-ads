import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Advertiser } from "./Entity/advertiser.entity";
import { AdvertiserService } from "./advertiser.service";
import { AdvertiserController } from "./advertiser.controller";


@Module({
  imports: [
    TypeOrmModule.forFeature([Advertiser])
  ],
  providers: [AdvertiserService],
  controllers: [AdvertiserController],
})
export class AdvertiserModule {}