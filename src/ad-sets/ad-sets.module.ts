import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdSet } from "./entities/ad-sets.entity";
import { AdSetsController } from "./ad-sets.controller";
import { AdSetsService } from "./ad-sets.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([AdSet])
    ],
    controllers: [
        AdSetsController
    ],
    providers: [
        AdSetsService
    ],
})
export class AdSetsModule {}