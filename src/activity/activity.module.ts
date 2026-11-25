import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { ActivityLog } from "./entities/activity-log.entity";
import { ActivityService } from "./activity.service";
import { ActivityController } from "./activity.controller";
import { ActorInterceptor } from "./actor.interceptor";

/** Global so any service can record history without importing this module. */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([ActivityLog, Campaign])],
    providers: [ActivityService, { provide: APP_INTERCEPTOR, useClass: ActorInterceptor }],
    controllers: [ActivityController],
    exports: [ActivityService],
})
export class ActivityModule {}
