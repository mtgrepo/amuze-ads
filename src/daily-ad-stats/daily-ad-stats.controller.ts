import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { DailyAdStatsService } from "./daily-ad-stats.service";
import { CreateDailyAdStatsDTO } from "./dto/create-daily-ad-stats.dto";
import { AdvertiserAdStats } from "./entities/daily-ad-stats.entity";

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

    @Patch('ID/:id/increase-stats')
    async increaseStats(@Param('id') id: string, @Body() statsToIncrement: Partial<AdvertiserAdStats>) {
        const updatedStats = await this.dailyAdStatsService.incrementStats(id, statsToIncrement);
        return {
            data: updatedStats,
            message: 'Daily ad stats incremented successfully',
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
