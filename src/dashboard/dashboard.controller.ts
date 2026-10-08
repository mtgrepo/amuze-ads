import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { DashboardService } from "./dashboard.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('dashboard/admin')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('attention')
    async getAttention() {
        return {
            data: await this.dashboardService.getAttention(),
            message: 'Attention items retrieved successfully',
        };
    }

    @Get('summary')
    async getSummary(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
        return {
            data: await this.dashboardService.getSummary(fromDate, toDate),
            message: 'Dashboard summary retrieved successfully',
        };
    }

    @Get('points')
    async getPointsSummary(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
        return {
            data: await this.dashboardService.getPointsSummary(fromDate, toDate),
            message: 'Points summary retrieved successfully',
        };
    }
}
