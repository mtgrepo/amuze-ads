import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AdvertiserProfilesService } from './advertiser-profiles.service';
import { CreateAdvertiserProfileDto } from './dto/create-advertiser-profile.dto';
import { UpdateAdvertiserProfileDto } from './dto/update-advertiser-profile.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('advertiser-profiles')
export class AdvertiserProfilesController {
  constructor(private readonly advertiserProfilesService: AdvertiserProfilesService) {}

  @Post()
  async create(@Body() createAdvertiserProfileDto: CreateAdvertiserProfileDto) {
    const advertiserProfile = await this.advertiserProfilesService.createAdvertiserProfile(createAdvertiserProfileDto);
    return {
      data: advertiserProfile,
      message: 'Advertiser profile created successfully',
    };
  }

  @Get()
  async findAll() {
    const profiles = await this.advertiserProfilesService.findAdvertiserProfiles();
    return {
      data: profiles,
      message: 'Advertiser profiles retrieved successfully',
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.advertiserProfilesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateAdvertiserProfileDto: UpdateAdvertiserProfileDto) {
    return await this.advertiserProfilesService.update(id, updateAdvertiserProfileDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.advertiserProfilesService.remove(id);
  }
}
