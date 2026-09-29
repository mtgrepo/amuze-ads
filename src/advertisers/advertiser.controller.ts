import { Controller, Get, Post, Body, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import { AdvertiserService } from './advertiser.service';
import { CreateAdvertiserDTO } from './dto/create-advertiser.dto';
import { UpdateAdvertiserDTO } from './dto/update-advertiser.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { CurrentUser } from 'src/auth/current-user.decorator';
import type { CurrentUserPayload } from 'src/auth/current-user.decorator';
import { CreateAccountDTO } from './dto/create-account.dto';
import { CreateClientDTO } from './dto/create-client.dto';
import { AdvertiserAccessGuard } from './advertiser-access.guard';

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

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Post('accounts')
    async createAccount(@Body() dto: CreateAccountDTO) {
        const account = await this.advertiserService.createAccount(dto);
        return {
            data: account,
            message: 'Account created successfully',
        };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('agency')
    @Get('my-clients')
    async findMyClients(@CurrentUser() user: CurrentUserPayload) {
        const clients = await this.advertiserService.findClientsOfAgency(user.id);
        return {
            data: clients,
            message: 'Clients retrieved successfully',
        };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('agency')
    @Post('my-clients')
    async createMyClient(@Body() dto: CreateClientDTO, @CurrentUser() user: CurrentUserPayload) {
        const client = await this.advertiserService.createClientForAgency(user.id, dto);
        return {
            data: client,
            message: 'Client created successfully',
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

    @UseGuards(JwtAuthGuard, AdvertiserAccessGuard)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const advertiser = await this.advertiserService.findAdvertiserById(id);
        return {
            data: advertiser,
            message: 'Advertiser retrieved successfully',
        };
    }

    @UseGuards(JwtAuthGuard, AdvertiserAccessGuard)
    @Patch(':id/update')
    async update(@Param('id') id: string, @Body() updateData: UpdateAdvertiserDTO, @CurrentUser() user: CurrentUserPayload) {
        const { status: _status, verified: _verified, ...selfEditable } = updateData;
        const advertiser = await this.advertiserService.updateAdvertiser(id, user.role === 'admin' ? updateData : selfEditable);
        return {
            data: advertiser,
            message: 'Advertiser updated successfully',
        };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Patch(':id/verify')
    async updateVerifyStatus(@Param('id') id: string, @Body('verified') verified: boolean) {
        const advertiser = await this.advertiserService.changeVerifyStatus(id, verified);
        return {
            data: advertiser,
            message: 'Advertiser Verify Status Update successful'
        }
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Patch(':id/status')
    async updateActiveStatus(@Param('id') id: string, @Body('status') status: string) {
        const advertiser = await this.advertiserService.changeActiveStatus(id, status);
        return {
            data: advertiser,
            message: 'Advertiser Active Status Changed'
        }
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Delete(':id')
    async remove(@Param('id') id: string) {
        const advertiser = await this.advertiserService.deleteAdvertiser(id);
        return {
            data: advertiser,
            message: 'Advertiser deleted successfully',
        };
    }

}