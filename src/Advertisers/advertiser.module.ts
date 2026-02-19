import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Advertiser } from "./entities/advertiser.entity";
import { AdvertiserService } from "./advertiser.service";
import { AdvertiserController } from "./advertiser.controller";
import { NotificationModule } from "src/notifications/notification.module";


@Module({
  imports: [
    TypeOrmModule.forFeature([Advertiser]),
    NotificationModule
  ],
  providers: [AdvertiserService],
  controllers: [AdvertiserController],
  exports: [AdvertiserService]
})
export class AdvertiserModule {}