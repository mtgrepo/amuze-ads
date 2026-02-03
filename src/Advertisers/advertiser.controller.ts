import { Controller, Get, Post, Body, Patch, Delete, Param } from '@nestjs/common';
import { AdvertiserService } from './advertiser.service';
import { CreateAdvertiserDTO } from './DTO/create-advertiser.dto';
import { UpdateAdvertiserDTO } from './DTO/update-advertiser.dto';

@Controller('advertisers')
export class AdvertiserController {
    constructor(private readonly advertiserService: AdvertiserService) {}

    @Post()
    async create(@Body() advertiserData: CreateAdvertiserDTO) {
        const advertiser = await this.advertiserService.createAdvertiser(advertiserData);
        return {
            data: advertiser,
            message: 'Advertiser created successfully',
        };
    }

    @Get()
    async findAll() {
        const advertisers = await this.advertiserService.findAdvertiserList();
        return {
            data: advertisers,
            message: 'Advertisers retrieved successfully',
        };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const advertiser = await this.advertiserService.findAdvertiserById(id);
        return {
            data: advertiser,
            message: 'Advertiser retrieved successfully',
        };
    }

    @Patch(':id/update')
    async update(@Param('id') id: string, @Body() updateData: UpdateAdvertiserDTO) {
        const advertiser = await this.advertiserService.updateAdvertiser(id, updateData);
        return {
            data: advertiser,
            message: 'Advertiser updated successfully',
        };
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        const advertiser = await this.advertiserService.deleteAdvertiser(id);
        return {
            data: advertiser,
            message: 'Advertiser deleted successfully',
        };
    }

}