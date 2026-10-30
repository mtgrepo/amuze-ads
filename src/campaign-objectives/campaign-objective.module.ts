import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CampaignObjective } from "./entities/campaign-objective.entity";
import { CampaignObjectiveService } from "./campaign-objective.service";
import { CampaignObjectiveController } from "./campaign-objective.controller";
import { SystemConfigsModule } from "src/system-configs/system-configs.module";
import { AdvertiserModule } from "src/advertisers/advertiser.module";

@Module({
    imports: [TypeOrmModule.forFeature([CampaignObjective]), SystemConfigsModule, AdvertiserModule],
    providers: [CampaignObjectiveService],
    controllers: [CampaignObjectiveController],
    exports: [CampaignObjectiveService],
})
export class CampaignObjectiveModule {}
