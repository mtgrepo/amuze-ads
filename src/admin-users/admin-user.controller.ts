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

    @Post()
    async create(@Body() adminUserData: CreateAdminUserDTO) {
        const adminUser = await this.adminUserService.createAdminUser(adminUserData);
        return {
            data: adminUser,
            message: 'Admin user created successfully',
        }
    }

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

    @Patch(':id/update')
    async update(@Param('id') id: string, @Body()updateData: UpdateAdminUserDTO) {
        const adminUser = await this.adminUserService.updateAdminUser(id, updateData);
        return {
            data: adminUser,
            message: 'Admin user updated successfully',
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