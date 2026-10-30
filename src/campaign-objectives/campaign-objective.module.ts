import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CampaignObjective } from "./entities/campaign-objective.entity";
import { CampaignObjectiveService } from "./campaign-objective.service";
import { CampaignObjectiveController } from "./campaign-objective.controller";
import { ObjectivePacingService } from "./objective-pacing.service";
import { SystemConfigsModule } from "src/system-configs/system-configs.module";
import { AdvertiserModule } from "src/advertisers/advertiser.module";

@Module({
    imports: [TypeOrmModule.forFeature([CampaignObjective]), SystemConfigsModule, AdvertiserModule],
    providers: [CampaignObjectiveService, ObjectivePacingService],
    controllers: [CampaignObjectiveController],
    exports: [CampaignObjectiveService, ObjectivePacingService],
})
export class CampaignObjectiveModule {}
