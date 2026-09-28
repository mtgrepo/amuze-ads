import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { CurrentUserPayload } from "../auth/current-user.decorator";
import { CampaignOwnershipGuard } from "./campaign-ownership.guard";
import { CampaignService } from "./campaign.service";
import { CreateCampaignDTO } from "./dto/create-campaign.dto";
import { UpdateCampaignDTO } from "./dto/update-campaign.dto";
import { CreateFullCampaignDto } from "./dto/create-full-campaign.dto";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CAMPAIGN_SELF_SERVICE_TRANSITIONS } from "./campaign-status";
import { AdvertiserService } from "src/advertisers/advertiser.service";

@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignController {

    constructor(
        private readonly campaignService: CampaignService,
        private readonly advertiserService: AdvertiserService,
    ) {}

    private calculateEndDate(startDate: Date, totalBudget: number, dailyBudget: number): Date {
        const days = Math.floor(totalBudget / dailyBudget);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days - 1);
        return endDate;
    }

    @Post()
    async createCampaign(@Body() campaignData: CreateCampaignDTO, @CurrentUser() user: CurrentUserPayload) {
        const { advertiserId, ...rest } = campaignData;
        const targetAdvertiserId = await this.advertiserService.resolveTargetAdvertiserId(user, advertiserId);
        const startDate = new Date(rest.startDate);
        const endDate = this.calculateEndDate(startDate, rest.totalBudget, rest.dailyBudget);
        // Always a draft; it leaves draft only through POST /campaigns/:id/pay.
        const campaign = await this.campaignService.createCampaign({
            ...rest,
            advertiserId: targetAdvertiserId,
            startDate,
            endDate,
            spentAmount: 0,
            status: 'draft',
        });
        return {
            data: campaign,
            message: 'Campaign created successfully',
        }
    }

    @Get()
    async findCampaigns(@CurrentUser() user: CurrentUserPayload, @Query('advertiserId') advertiserId?: string) {
        const campaigns = await this.campaignService.findCampaignList(
            await this.advertiserService.resolveListScope(user, advertiserId),
        );
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
        const { startDate, endDate, ...rest } = updateData;
        const campaign = await this.campaignService.updateCampaign(id, {
            ...rest,
            ...(startDate && { startDate: new Date(startDate) }),
            ...(endDate && { endDate: new Date(endDate) }),
        });
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
    @Post(':id/pay')
    async pay(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
        const campaign = await this.campaignService.payCampaign(id, user.role);
        return {
            data: campaign,
            message: 'Payment recorded successfully',
        }
    }

    @Post('full')
    @UseInterceptors(FileInterceptor('asset', { storage: memoryStorage() }))
    async createFullCampaign(
        @Body() dto: CreateFullCampaignDto,
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        const advertiserId = await this.advertiserService.resolveTargetAdvertiserId(user, dto.advertiserId);

        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        const dailyBudget = Number(dto.dailyBudget);
        const totalBudget = Number(dto.totalBudget);

        const result = await this.campaignService.createFullCampaign({
            advertiserId,
            name: dto.name,
            budgetPlan: dto.budgetPlan,
            dailyBudget,
            totalBudget,
            startDate,
            endDate,
            creativeName: dto.creativeName,
            assetType: dto.assetType,
            destinationLink: dto.destinationLink,
            ageMin: Number(dto.ageMin),
            ageMax: Number(dto.ageMax),
            gender: dto.gender,
            adType: dto.adType,
            placementKey: dto.placementKey,
        }, file);

        return {
            data: result,
            message: 'Campaign created successfully',
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
