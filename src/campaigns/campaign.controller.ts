import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
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

    @Post()
    async createCampaign(@Body() campaignData: CreateCampaignDTO, @CurrentUser() user: CurrentUserPayload) {
        const targetAdvertiserId = await this.advertiserService.resolveTargetAdvertiserId(user, campaignData.advertiserId);
        const campaign = await this.campaignService.createCampaign({
            advertiserId: targetAdvertiserId,
            name: campaignData.name,
            modelType: campaignData.modelType,
            packageId: campaignData.packageId,
            packageQuantity: campaignData.packageQuantity,
            startDate: campaignData.startDate,
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
        const campaign = await this.campaignService.updateCampaign(id, updateData);
        return {
            data: campaign,
            message: 'Campaign updated successfully',
        }
    }

    @UseGuards(CampaignOwnershipGuard)
    @Patch(':id/change-status')
    async changeStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() user: CurrentUserPayload) {
        if (status === 'paused') {
            throw new BadRequestException('Pausing campaigns is not supported yet');
        }
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
    @Get(':id/payment-info')
    async paymentInfo(@Param('id') id: string) {
        const info = await this.campaignService.getPaymentInfo(id);
        return {
            data: info,
            message: 'Payment info retrieved successfully',
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

        const result = await this.campaignService.createFullCampaign({
            advertiserId,
            name: dto.name,
            packageId: dto.packageId,
            packageQuantity: Number(dto.packageQuantity),
            startDate: dto.startDate,
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
