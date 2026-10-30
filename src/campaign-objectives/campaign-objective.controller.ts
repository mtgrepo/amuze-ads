import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { CampaignObjectiveService } from "./campaign-objective.service";
import { SaveObjectivesDto } from "./dto/objective-input.dto";

/** Prices are visible to everyone signed in; a campaign's objectives to its owner, their agency and admins. */
@UseGuards(JwtAuthGuard)
@Controller('campaign-objectives')
export class CampaignObjectiveController {
    constructor(private readonly objectiveService: CampaignObjectiveService) {}

    @Get('prices')
    async prices() {
        return { data: await this.objectiveService.getPrices(), message: 'Objective prices retrieved successfully' };
    }

    @Put('campaign/:campaignId')
    async save(
        @Param('campaignId', ParseUUIDPipe) campaignId: string,
        @Body() dto: SaveObjectivesDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        const result = await this.objectiveService.saveForCampaign(campaignId, dto.objectives, user);
        return { data: result, message: 'Objectives saved successfully' };
    }
}
