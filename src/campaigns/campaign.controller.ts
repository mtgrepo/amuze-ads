import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CampaignService } from "./campaign.service";
import { Campaign } from "./entities/campaign.entity";
import { CreateCampaignDTO } from "./dto/create-campaign.dto";
import { UpdateCampaignDTO } from "./dto/update-campaign.dto";

@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignController {

    constructor(
        private readonly campaignService: CampaignService
    ) {}

    @Post()
    async createCampaign(@Body() campaignData: CreateCampaignDTO) {
        const campaign = await this.campaignService.createCampaign({
            ...campaignData,
            startDate: new Date(campaignData.startDate),
            endDate: new Date(campaignData.endDate)
        });
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
        const { startDate, endDate, ...rest } = updateData;
        const campaign = await this.campaignService.updateCampaign(id, {
            ...rest,
            ...(startDate && { startDate: new Date(startDate) }),
            ...(endDate && { endDate: new Date(endDate) })
        });
        return {
            data: campaign,
            message: 'Campaign updated successfully',
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