import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { DailyAdStatsService } from "./daily-ad-stats.service";
import { CreateDailyAdStatsDTO } from "./dto/create-daily-ad-stats.dto";
import { AdvertiserAdStats } from "./entities/daily-ad-stats.entity";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { AdvertiserService } from "src/advertisers/advertiser.service";

@UseGuards(JwtAuthGuard)
@Controller('daily-ad-stats')
export class DailyAdStatsController {
    constructor(
        private readonly dailyAdStatsService: DailyAdStatsService,
        private readonly advertiserService: AdvertiserService,
    ) {}

    /** Admin sees any ad; an agency only its clients' ads; an advertiser only their own. */
    private async assertCanViewAd(user: CurrentUserPayload, adId: string): Promise<void> {
        const ownerId = await this.dailyAdStatsService.findAdOwnerId(adId);
        if (!(await this.advertiserService.canAccessAdvertiser(user, ownerId))) {
            throw new ForbiddenException('You do not have permission to view this ad');
        }
    }

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
    async findByAdId(@Param('adId', ParseUUIDPipe) adId: string, @CurrentUser() user: CurrentUserPayload) {
        await this.assertCanViewAd(user, adId);
        const stats = await this.dailyAdStatsService.findByAdId(adId);
        return {
            data: stats,
            message: 'Daily ad stats retrieved successfully',
        };
    }

    @Get('ad/:adId/range')
    async findByDateRange(
        @Param('adId', ParseUUIDPipe) adId: string,
        @CurrentUser() user: CurrentUserPayload,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        await this.assertCanViewAd(user, adId);
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
    async getAdminOverview(
        @CurrentUser() user: CurrentUserPayload,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('advertiserId') advertiserId?: string,
        @Query('adId', new ParseUUIDPipe({ optional: true })) adId?: string,
    ) {
        const scope = await this.advertiserService.resolveListScope(user, advertiserId);
        if (adId) await this.assertCanViewAd(user, adId);
        const result = await this.dailyAdStatsService.getAdminOverview(fromDate, toDate, scope, adId);
        return {
            data: result,
            message: 'Admin overview retrieved successfully',
        };
    }

    @Get('admin/trend')
    async getAdminTrend(
        @CurrentUser() user: CurrentUserPayload,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('advertiserId') advertiserId?: string,
        @Query('adId', new ParseUUIDPipe({ optional: true })) adId?: string,
    ) {
        const scope = await this.advertiserService.resolveListScope(user, advertiserId);
        if (adId) await this.assertCanViewAd(user, adId);
        const result = await this.dailyAdStatsService.getAdminTrend(fromDate, toDate, scope, adId);
        return {
            data: result,
            message: 'Admin trend retrieved successfully',
        };
    }

    @Get('admin/top-ads')
    async getTopAds(
        @CurrentUser() user: CurrentUserPayload,
        @Query('limit') limit: string = '5',
        @Query('metric') metric: string = 'clicks',
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('advertiserId') advertiserId?: string,
    ) {
        const scope = await this.advertiserService.resolveListScope(user, advertiserId);
        const result = await this.dailyAdStatsService.getTopAds(parseInt(limit) || 5, metric, fromDate, toDate, scope);
        return {
            data: result,
            message: 'Top ads retrieved successfully',
        };
    }

    @Get('admin/placements')
    async getPlacementBreakdown(
        @CurrentUser() user: CurrentUserPayload,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('advertiserId') advertiserId?: string,
    ) {
        const scope = await this.advertiserService.resolveListScope(user, advertiserId);
        const result = await this.dailyAdStatsService.getPlacementBreakdown(fromDate, toDate, scope);
        return {
            data: result,
            message: 'Placement breakdown retrieved successfully',
        };
    }

    @Get('admin/by-advertiser')
    async getAdvertiserBreakdown(
        @CurrentUser() user: CurrentUserPayload,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('advertiserId') advertiserId?: string,
    ) {
        const scope = await this.advertiserService.resolveListScope(user, advertiserId);
        const result = await this.dailyAdStatsService.getAdvertiserBreakdown(fromDate, toDate, scope);
        return {
            data: result,
            message: 'Advertiser breakdown retrieved successfully',
        };
    }
}
