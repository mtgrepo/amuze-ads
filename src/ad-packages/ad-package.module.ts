import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdPackage } from "./entities/ad-package.entity";
import { AdPackageService } from "./ad-package.service";
import { AdPackageController } from "./ad-package.controller";

@Module({
    imports: [TypeOrmModule.forFeature([AdPackage])],
    providers: [AdPackageService],
    controllers: [AdPackageController],
    exports: [AdPackageService],
})
export class AdPackageModule {}
