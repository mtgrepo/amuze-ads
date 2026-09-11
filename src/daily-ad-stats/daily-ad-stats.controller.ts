import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { DailyAdStatsService } from "./daily-ad-stats.service";
import { CreateDailyAdStatsDTO } from "./dto/create-daily-ad-stats.dto";
import { AdvertiserAdStats } from "./entities/daily-ad-stats.entity";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";

@UseGuards(JwtAuthGuard)
@Controller('daily-ad-stats')
export class DailyAdStatsController {
    constructor(private readonly dailyAdStatsService: DailyAdStatsService) {}

    @UseGuards(RolesGuard)
    @Roles('admin')
    @Post()
    async create(@Body() adStatsData: CreateDailyAdStatsDTO) {
        const adStats = await this.dailyAdStatsService.create({
            ...adStatsData,
            startDate: new Date(adStatsData.startDate)
        });
        return {
            data: adStats,
            message: 'Daily ad stats created successfully',
        };
    }

    @UseGuards(RolesGuard)
    @Roles('admin')
    @Patch('ID/:id/increase-stats')
    async increaseStats(@Param('id') id: string, @Body() statsToIncrement: Partial<AdvertiserAdStats>) {
        const updatedStats = await this.dailyAdStatsService.incrementStats(id, statsToIncrement);
        return {
            data: updatedStats,
            message: 'Daily ad stats incremented successfully',
        };
    }

    @Get('ad/:adId')
    async findByAdId(@Param('adId') adId: string) {
        const stats = await this.dailyAdStatsService.findByAdId(adId);
        return {
            data: stats,
            message: 'Daily ad stats retrieved successfully',
        };
    }

    @Get('ad/:adId/range')
    async findByDateRange(
        @Param('adId') adId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        const stats = await this.dailyAdStatsService.findByDateRange(
            adId,
            new Date(startDate),
            new Date(endDate)
        );
        return {
            data: stats,
            message: 'Daily ad stats retrieved successfully',
        };
    }

    @Get('admin/overview')
    async getAdminOverview(@Query('advertiserId') advertiserId?: string) {
        const result = await this.dailyAdStatsService.getAdminOverview(advertiserId);
        return {
            data: result,
            message: 'Admin overview retrieved successfully',
        };
    }

    @Get('admin/trend')
    async getAdminTrend(
        @Query('days') days: string = '7',
        @Query('advertiserId') advertiserId?: string,
    ) {
        const result = await this.dailyAdStatsService.getAdminTrend(parseInt(days) || 7, advertiserId);
        return {
            data: result,
            message: 'Admin trend retrieved successfully',
        };
    }

    @Get('admin/top-ads')
    async getTopAds(
        @Query('limit') limit: string = '5',
        @Query('metric') metric: string = 'clicks',
        @Query('advertiserId') advertiserId?: string,
    ) {
        const result = await this.dailyAdStatsService.getTopAds(parseInt(limit) || 5, metric, advertiserId);
        return {
            data: result,
            message: 'Top ads retrieved successfully',
        };
    }
}
