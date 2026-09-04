import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CampaignService } from "./campaign.service";
import { CreateCampaignDTO } from "./dto/create-campaign.dto";
import { UpdateCampaignDTO } from "./dto/update-campaign.dto";

@UseGuards(JwtAuthGuard)
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
    async createCampaign(@Body() campaignData: CreateCampaignDTO) {
        const { paymentMethod, ...rest } = campaignData;
        const startDate = new Date(rest.startDate);
        const endDate = this.calculateEndDate(startDate, rest.totalBudget, rest.dailyBudget);
        const campaign = await this.campaignService.createCampaign({
            ...rest,
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
    async findCampaigns() {
        const campaigns = await this.campaignService.findCampaignList();
        return {
            data: campaigns,
            message: 'Campaigns found successfully',
        }
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const campaign = await this.campaignService.findCampaignById(id);
        return {
            data: campaign,
            message: 'Campaign found successfully',
        }
    }

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

    @Patch(':id/change-status')
    async changeStatus(@Param('id') id: string, @Body('status') status: string) {
        const campaign = await this.campaignService.changeCampaignStatus(id, status);
        return {
            data: campaign,
            message: 'Campaign status changed successfully',
        }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        const campaign = await this.campaignService.deleteCampaign(id);
        return {
            data: campaign,
            message: 'Campaign deleted successfully',
        }
    }
}