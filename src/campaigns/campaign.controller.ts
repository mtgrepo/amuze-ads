import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { CurrentUserPayload } from "../auth/current-user.decorator";
import { CampaignOwnershipGuard } from "./campaign-ownership.guard";
import { CampaignService } from "./campaign.service";
import { CreateCampaignDTO } from "./dto/create-campaign.dto";
import { UpdateCampaignDTO } from "./dto/update-campaign.dto";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CAMPAIGN_SELF_SERVICE_TRANSITIONS } from "./campaign-status";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('campaigns')
export class CampaignController {

    constructor(
        private readonly campaignService: CampaignService
    ) {}

    private calculateEndDate(startDate: Date, totalBudget: number, dailyBudget: number): Date {
        const days = Math.floor(totalBudget / dailyBudget);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days - 1);
        return endDate;
    }

    @Post()
    async createCampaign(@Body() campaignData: CreateCampaignDTO, @CurrentUser() user: CurrentUserPayload) {
        const { paymentMethod, advertiserId, ...rest } = campaignData;
        const startDate = new Date(rest.startDate);
        const endDate = this.calculateEndDate(startDate, rest.totalBudget, rest.dailyBudget);
        const campaign = await this.campaignService.createCampaign({
            ...rest,
            advertiserId: user.role === 'admin' ? advertiserId : user.id,
            startDate,
            endDate,
            spentAmount: 0,
        }, paymentMethod);
        return {
            data: campaign,
            message: 'Campaign created successfully',
        }
    }

    @Get()
    async findCampaigns(@CurrentUser() user: CurrentUserPayload) {
        const campaigns = await this.campaignService.findCampaignList(user.role === 'admin' ? undefined : user.id);
        return {
            data: campaigns,
            message: 'Campaigns found successfully',
        }
    }

    @UseGuards(CampaignOwnershipGuard)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const campaign = await this.campaignService.findCampaignById(id);
        return {
            data: campaign,
            message: 'Campaign found successfully',
        }
    }

    @UseGuards(CampaignOwnershipGuard)
    @Patch(':id/update')
    async update(@Param('id') id: string, @Body() updateData: UpdateCampaignDTO) {
        const { startDate, paymentMethod, ...rest } = updateData;

        let endDate: Date | undefined;
        if (startDate || updateData.totalBudget !== undefined || updateData.dailyBudget !== undefined) {
            const existing = await this.campaignService.findCampaignById(id);
            const resolvedStartDate = startDate ? new Date(startDate) : existing.startDate;
            const resolvedTotalBudget = updateData.totalBudget ?? existing.totalBudget;
            const resolvedDailyBudget = updateData.dailyBudget ?? existing.dailyBudget;
            endDate = this.calculateEndDate(resolvedStartDate, resolvedTotalBudget, resolvedDailyBudget);
        }

        const campaign = await this.campaignService.updateCampaign(id, {
            ...rest,
            ...(startDate && { startDate: new Date(startDate) }),
            ...(endDate && { endDate }),
        }, paymentMethod);
        return {
            data: campaign,
            message: 'Campaign updated successfully',
        }
    }

    @UseGuards(CampaignOwnershipGuard)
    @Patch(':id/change-status')
    async changeStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() user: CurrentUserPayload) {
        if (user.role !== 'admin') {
            const existing = await this.campaignService.findCampaignById(id);
            const allowed = CAMPAIGN_SELF_SERVICE_TRANSITIONS[existing.status] ?? [];
            if (!allowed.includes(status)) {
                throw new ForbiddenException(`You cannot change a campaign from "${existing.status}" to "${status}"`);
            }
        }
        const campaign = await this.campaignService.changeCampaignStatus(id, status);
        return {
            data: campaign,
            message: 'Campaign status changed successfully',
        }
    }

        @UseGuards(RolesGuard)
    @Roles('admin')
    @Post(':id/approve')
    async approve(@Param('id') id: string) {
        const campaign = await this.campaignService.approveCampaign(id);
        return {
            data: campaign,
            message: 'Campaign approved successfully',
        }
    }

    @UseGuards(RolesGuard)
    @Roles('admin')
    @Post(':id/reject')
    async reject(@Param('id') id: string) {
        const campaign = await this.campaignService.rejectCampaign(id);
        return {
            data: campaign,
            message: 'Campaign rejected successfully',
        }
    }

    @UseGuards(CampaignOwnershipGuard)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        const campaign = await this.campaignService.deleteCampaign(id);
        return {
            data: campaign,
            message: 'Campaign deleted successfully',
        }
    }
}
