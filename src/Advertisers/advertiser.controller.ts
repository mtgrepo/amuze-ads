import { Controller, Get, Post, Body, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import { AdvertiserService } from './advertiser.service';
import { CreateAdvertiserDTO } from './dto/create-advertiser.dto';
import { UpdateAdvertiserDTO } from './dto/update-advertiser.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

// @UseGuards(JwtAuthGuard)
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

    @Patch(':id/verify')
    async updateVerifyStatus(@Param('id') id: string, @Body('verified') verified: boolean) {
        const advertiser = await this.advertiserService.changeVerifyStatus(id, verified);
        return {
            data: advertiser,
            message: 'Advertiser Verify Status Update successful'
        }
    }

    @Patch(':id/status')
    async updateActiveStatus(@Param('id') id: string, @Body('status') status: string) {
        const advertiser = await this.advertiserService.changeActiveStatus(id, status);
        return {
            data: advertiser,
            message: 'Advertiser Active Status Changed'
        }
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