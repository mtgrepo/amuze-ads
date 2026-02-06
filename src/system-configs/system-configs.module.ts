import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SystemConfig } from "./entities/system-config.entity";
import { SystemConfigsService } from "./system-configs.service";
import { SystemConfigsController } from "./system-configs.controller";

@Module({
    imports: [
        TypeOrmModule.forFeature([SystemConfig])
    ],
    providers: [SystemConfigsService],
    controllers: [SystemConfigsController],
    exports: [SystemConfigsService]
})
export class SystemConfigsModule {}
