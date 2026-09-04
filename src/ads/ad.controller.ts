import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdService } from "./ad.service";
import { AdOwnershipGuard } from "./ad-ownership.guard";
import { AD_SELF_SERVICE_TRANSITIONS } from "./ad-status";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { CreateAdSetsDTO } from "src/ad-sets/dto/create-ad-sets.dto";
import { UpdateAdSetsDTO } from "src/ad-sets/dto/update-ad-sets.dto";

@UseGuards(JwtAuthGuard)
@Controller('ads')
export class AdController {
    constructor(private readonly adService: AdService) {}

    @Post()
    async create(@Body() dto: CreateAdSetsDTO) {
        const ad = await this.adService.createAd(dto);
        return {
            data: ad,
            message: "Ad created successfully"
        };
    }

    @Get()
    async findAll(@CurrentUser() user: CurrentUserPayload) {
        const ads = await this.adService.findAdList(user.role === 'admin' ? undefined : user.id);
        return {
            data: ads,
            message: "Ads retrieved successfully"
        };
    }

    @UseGuards(AdOwnershipGuard)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const ad = await this.adService.findAdById(id);
        return {
            data: ad,
            message: "Ad retrieved successfully"
        };
    }

    @UseGuards(AdOwnershipGuard)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateAdSetsDTO) {
        const ad = await this.adService.updateAd(id, dto);
        return {
            data: ad,
            message: "Ad updated successfully"
        };
    }

    @UseGuards(AdOwnershipGuard)
    @Patch(':id/status')
    async updateStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() user: CurrentUserPayload) {
        if (user.role !== 'admin') {
            const existing = await this.adService.findAdById(id);
            const allowed = AD_SELF_SERVICE_TRANSITIONS[existing.status] ?? [];
            if (!allowed.includes(status)) {
                throw new ForbiddenException(`You cannot change an ad from "${existing.status}" to "${status}"`);
            }
        }
        const ad = await this.adService.updateStatus(id, status);
        return {
            data: ad,
            message: "Ad status updated successfully"
        };
    }

    @UseGuards(RolesGuard)
    @Roles('admin')
    @Post(':id/approve')
    async approve(@Param('id') id: string) {
        const ad = await this.adService.approveAd(id);
        return {
            data: ad,
            message: "Ad approved successfully"
        };
    }

    @UseGuards(RolesGuard)
    @Roles('admin')
    @Post(':id/reject')
    async reject(@Param('id') id: string) {
        const ad = await this.adService.rejectAd(id);
        return {
            data: ad,
            message: "Ad rejected successfully"
        };
    }
}
