import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { AdService } from "./ad.service";
import { CreateAdDTO } from "./dto/create-ad.dto";

@Controller('ads')
export class AdController {
    constructor(private readonly adService: AdService) {}

    @Post()
    async create(@Body() createAdData: CreateAdDTO) {
        const ad = await this.adService.createAd(createAdData);
        return {
            data: ad,
            message: "Ad created successfully"
        }
    }

    @Get()
    async findAll() {
        const ads = await this.adService.findAdList();
        return {
            data: ads,
            message: "Ads retrieved successfully"
        }
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const ad = await this.adService.findAdById(id);
        return {
            data: ad,
            message: "Ad retrieved successfully"
        }
    }

    @Patch(':id/status')
    async updateStatus(@Param('id') id: string, @Body('status') status: string) {
        const ad = await this.adService.updateStatus(id, status);
        return {
            data: ad,
            message: "Ad status updated successfully"
        }
    }

}