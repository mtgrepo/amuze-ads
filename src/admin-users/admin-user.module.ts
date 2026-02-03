import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminUser } from "./entities/admin-user.entity";
import { AdminUserService } from "./admin-user.service";
import { AdminUserController } from "./admin-user.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser])
  ],
  providers: [AdminUserService],
  controllers: [AdminUserController],
  exports: [AdminUserService],
})
export class AdminUserModule {}