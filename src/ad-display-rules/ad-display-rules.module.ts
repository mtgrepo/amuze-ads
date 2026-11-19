import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdDisplayRule } from "./entities/ad-display-rule.entity";
import { AdDisplayRulesService } from "./ad-display-rules.service";
import { AdDisplayRulesController } from "./ad-display-rules.controller";

@Module({
    imports: [TypeOrmModule.forFeature([AdDisplayRule])],
    providers: [AdDisplayRulesService],
    controllers: [AdDisplayRulesController],
    exports: [AdDisplayRulesService],
})
export class AdDisplayRulesModule {}
