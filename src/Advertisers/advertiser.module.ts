import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Advertiser } from "./entities/advertiser.entity";
import { AdvertiserService } from "./advertiser.service";
import { AdvertiserController } from "./advertiser.controller";


@Module({
  imports: [
    TypeOrmModule.forFeature([Advertiser])
  ],
  providers: [AdvertiserService],
  controllers: [AdvertiserController],
  exports: [AdvertiserService]
})
export class AdvertiserModule {}