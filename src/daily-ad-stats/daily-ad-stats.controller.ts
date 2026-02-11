import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { DailyAdStatsService } from "./daily-ad-stats.service";
import { CreateDailyAdStatsDTO } from "./dto/create-daily-ad-stats.dto";

@UseGuards(JwtAuthGuard)
@Controller('daily-ad-stats')
export class DailyAdStatsController {
    constructor(private readonly dailyAdStatsService: DailyAdStatsService) {}

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

    @Get('ad/:adId/servable')
    async checkAdServable(@Param('adId') adId: string) {
        const result = await this.dailyAdStatsService.checkAdServable(adId);
        return {
            data: result,
            message: 'Ad servability check completed',
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
}
