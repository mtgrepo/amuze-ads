import { Body, Controller, Get, Param, ParseBoolPipe, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { AdPackageService } from "./ad-package.service";
import { CreateAdPackageDto } from "./dto/create-ad-package.dto";
import { UpdateAdPackageDto } from "./dto/update-ad-package.dto";

/** Everyone signed in can see the active packages; only admins manage them. Packages are never deleted. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ad-packages')
export class AdPackageController {
    constructor(private readonly packageService: AdPackageService) {}

    @Get()
    async findActive() {
        return { data: await this.packageService.findActive(), message: 'Packages retrieved successfully' };
    }

    @Roles('admin')
    @Get('all')
    async findAll() {
        return { data: await this.packageService.findAll(), message: 'Packages retrieved successfully' };
    }

    @Roles('admin')
    @Post()
    async create(@Body() dto: CreateAdPackageDto) {
        return { data: await this.packageService.create(dto), message: 'Package created successfully' };
    }

    @Roles('admin')
    @Patch(':id')
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdPackageDto) {
        return { data: await this.packageService.update(id, dto), message: 'Package updated successfully' };
    }

    @Roles('admin')
    @Patch(':id/active')
    async setActive(@Param('id', ParseUUIDPipe) id: string, @Body('isActive', ParseBoolPipe) isActive: boolean) {
        const pkg = await this.packageService.setActive(id, isActive);
        return { data: pkg, message: isActive ? 'Package activated' : 'Package deactivated' };
    }
}
