import { Controller, ForbiddenException, Get, NotFoundException, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { ActivityService } from "./activity.service";

@UseGuards(JwtAuthGuard)
@Controller('activity')
export class ActivityController {
    constructor(
        private readonly activityService: ActivityService,
        @InjectRepository(Campaign)
        private readonly campaignRepository: Repository<Campaign>,
    ) {}

    /** Admin: the activity log, newest first. Filter by ad, advertiser, record, action, who and date; ?all=true for an export. */
    @UseGuards(RolesGuard)
    @Roles('admin')
    @Get()
    async list(
        @Query('campaignId', new ParseUUIDPipe({ optional: true })) campaignId?: string,
        @Query('advertiserId', new ParseUUIDPipe({ optional: true })) advertiserId?: string,
        @Query('entityType') entityType?: string,
        @Query('entityId') entityId?: string,
        @Query('action') action?: string,
        @Query('actorType') actorType?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('all') all?: string,
    ) {
        const result = await this.activityService.find(
            { campaignId, advertiserId, entityType, entityId, action, actorType, from, to },
            Number(page) || 1,
            Number(limit) || 25,
            all === 'true',
        );
        return { data: result, message: 'Activity retrieved successfully' };
    }

    /** Customer portal: one of their ads' history, without who on the Amuze side acted. */
    @Get('mine')
    async mine(
        @CurrentUser() user: CurrentUserPayload,
        @Query('campaignId', ParseUUIDPipe) campaignId: string,
    ) {
        const campaign = await this.campaignRepository.findOne({ where: { id: campaignId }, relations: { advertiser: true } });
        if (!campaign) throw new NotFoundException('Campaign not found');
        // Their own ad, or (for an agency) one of its clients' ads.
        const owner = campaign.advertiser;
        const allowed = user.role === 'admin' || owner?.id === user.id || (user.role === 'agency' && owner?.agencyId === user.id);
        if (!allowed) {
            throw new ForbiddenException('You cannot view this ad');
        }
        return { data: await this.activityService.findForCampaignWithoutActors(campaignId), message: 'Activity retrieved successfully' };
    }
}
