import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdSetsService } from "./ad-sets.service";
import { CreateAdSetsDTO } from "./dto/create-ad-sets.dto";
import { UpdateAdSetsDTO } from "./dto/update-ad-sets.dto";

@UseGuards(JwtAuthGuard)
@Controller("ad-sets")
export class AdSetsController {
    
    constructor(
        private readonly adSetsService: AdSetsService
    ) {}

    @Post()
    async createAdSet(@Body() adSetData: CreateAdSetsDTO) {
        const data = await this.adSetsService.createAdSet(adSetData);
        return {
            data,
            message: "Ad set created successfully"
        }
    }

    @Get()
    async findAdSets() {
        const data = await this.adSetsService.findAdSetsList();
        return {
            data,
            message: "Ad sets list found successfully"
        }
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const data = await this.adSetsService.findAdSetById(id);
        return {
            data, 
            message: "Ad set found successfully"
        }
    }

    @Patch(':id/update')
    async update(@Param('id') id: string, @Body() updateData: UpdateAdSetsDTO) {
        const data = await this.adSetsService.updateAdSet(id, updateData);
        return {
            data,
            message: "Ad set updated successfully"
        }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        const data = await this.adSetsService.deleteAdSet(id);
        return {
            data,
            message: "Ad set deleted successfully"
        }
    }
}