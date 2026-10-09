import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { CampaignExtensionService } from "./campaign-extension.service";
import { CreateCampaignExtensionDto } from "./dto/create-campaign-extension.dto";

/** Owners, their agency and admins can quote, request and list; only admins approve or reject. */
@UseGuards(JwtAuthGuard)
@Controller('campaign-extensions')
export class CampaignExtensionController {
    constructor(private readonly extensionService: CampaignExtensionService) {}

    /** ?campaignId= lists one campaign's extensions; otherwise every visible one, optionally ?status=pending. */
    @Get()
    async list(
        @CurrentUser() user: CurrentUserPayload,
        @Query('campaignId') campaignId?: string,
        @Query('status') status?: string,
    ) {
        const extensions = campaignId
            ? await this.extensionService.findForCampaign(campaignId, user)
            : await this.extensionService.findScoped(user, status);
        return { data: extensions, message: 'Extensions retrieved successfully' };
    }

    /** Price and dates for a new end date, without charging anything. */
    @Get('quote')
    async quote(
        @CurrentUser() user: CurrentUserPayload,
        @Query('campaignId', ParseUUIDPipe) campaignId: string,
        @Query('newEndDate') newEndDate: string,
    ) {
        return { data: await this.extensionService.quote(campaignId, newEndDate, user), message: 'Extension quote' };
    }

    @Post()
    async request(@Body() dto: CreateCampaignExtensionDto, @CurrentUser() user: CurrentUserPayload) {
        const extension = await this.extensionService.request(dto.campaignId, dto.newEndDate, user);
        return {
            data: extension,
            message: extension.status === 'approved' ? 'Campaign extended' : 'Extension submitted for review',
        };
    }

    @UseGuards(RolesGuard)
    @Roles('admin')
    @Post(':id/approve')
    async approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
        return { data: await this.extensionService.approve(id, user.id), message: 'Extension approved' };
    }

    @UseGuards(RolesGuard)
    @Roles('admin')
    @Post(':id/reject')
    async reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
        return { data: await this.extensionService.reject(id, user.id), message: 'Extension rejected and refunded' };
    }
}
