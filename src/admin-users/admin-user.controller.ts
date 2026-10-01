import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminUserService } from "./admin-user.service";
import { CreateAdminUserDTO } from "./dto/create-admin-user.dto";
import { UpdateAdminUserDTO } from "./dto/update-admin-user.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin-users')
export class AdminUserController {
    constructor(private readonly adminUserService: AdminUserService) {}

    @Get()
    async findAll() {
        const adminUsers = await this.adminUserService.findAdminUserList();
        return {
            data: adminUsers,
            message: 'Admin users retrieved successfully',
        }
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const adminUser = await this.adminUserService.findAdminUserById(id);
        return {
            data: adminUser,
            message: 'Admin user retrieved successfully',
        }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        const adminUser = await this.adminUserService.deleteAdminUser(id);
        return {
            data: adminUser,
            message: 'Admin user deleted successfully',
        }
    }

}