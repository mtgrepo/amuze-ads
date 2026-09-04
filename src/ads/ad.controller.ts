import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdService } from "./ad.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
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
    async findAll() {
        const ads = await this.adService.findAdList();
        return {
            data: ads,
            message: "Ads retrieved successfully"
        };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const ad = await this.adService.findAdById(id);
        return {
            data: ad,
            message: "Ad retrieved successfully"
        };
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateAdSetsDTO) {
        const ad = await this.adService.updateAd(id, dto);
        return {
            data: ad,
            message: "Ad updated successfully"
        };
    }

    @Patch(':id/status')
    async updateStatus(@Param('id') id: string, @Body('status') status: string) {
        const ad = await this.adService.updateStatus(id, status);
        return {
            data: ad,
            message: "Ad status updated successfully"
        };
    }
}
