import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { SystemConfigsService } from "./system-configs.service";
import { CreateSystemConfigDTO } from "./dto/create-system-config.dto";
import { UpdateSystemConfigDTO } from "./dto/update-system-config.dto";

@UseGuards(JwtAuthGuard)
@Controller('system-configs')
export class SystemConfigsController {
    constructor(private readonly systemConfigsService: SystemConfigsService) {}

    @Post()
    async create(@Body() createDto: CreateSystemConfigDTO) {
        const config = await this.systemConfigsService.create(createDto);
        return {
            data: config,
            message: 'System config created successfully',
        };
    }

    @Get()
    async getAll() {
        const configs = await this.systemConfigsService.getAll();
        return {
            data: configs,
            message: 'System configs retrieved successfully',
        };
    }

    @Get('category/:category')
    async getByCategory(@Param('category') category: string) {
        const configs = await this.systemConfigsService.getByCategory(category);
        return {
            data: configs,
            message: 'System configs retrieved successfully',
        };
    }

    @Get('key/:configKey')
    async getByConfigKey(@Param('configKey') configKey: string) {
        const config = await this.systemConfigsService.getByConfigKey(configKey);
        return {
            data: config,
            message: 'System config retrieved successfully',
        };
    }

    @Patch(':id')
    async updateById(@Param('id') id: string, @Body() updateDto: UpdateSystemConfigDTO) {
        const config = await this.systemConfigsService.updateById(id, updateDto);
        return {
            data: config,
            message: 'System config updated successfully',
        };
    }

    @Patch(':id/inactive')
    async inactiveById(@Param('id') id: string) {
        const config = await this.systemConfigsService.inactiveById(id);
        return {
            data: config,
            message: 'System config inactivated successfully',
        };
    }
}
