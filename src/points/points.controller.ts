import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { PointsService } from "./points.service";
import { PurchasePointsDTO } from "./dto/purchase-points.dto";
import { TopUpPointsDTO } from "./dto/top-up-points.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('points')
export class PointsController {
    constructor(private readonly pointsService: PointsService) {}

    // Logged-in advertisers and agencies own their wallet (agency clients never log in).
    @Roles('advertiser', 'agency')
    @Post('purchase')
    async purchase(@Body() dto: PurchasePointsDTO, @CurrentUser() user: CurrentUserPayload) {
        const result = await this.pointsService.purchase(user.id, dto.amount);
        return {
            data: result,
            message: 'Points purchased successfully',
        };
    }

    @Roles('advertiser', 'agency')
    @Get('me')
    async myWallet(@CurrentUser() user: CurrentUserPayload) {
        const wallet = await this.pointsService.getWallet(user.id);
        return {
            data: wallet,
            message: 'Wallet retrieved successfully',
        };
    }

    @Roles('admin')
    @Get('accounts/:id')
    async accountWallet(@Param('id') id: string) {
        const wallet = await this.pointsService.getWallet(id);
        return {
            data: wallet,
            message: 'Wallet retrieved successfully',
        };
    }

    @Roles('admin')
    @Post('accounts/:id/top-up')
    async topUp(@Param('id') id: string, @Body() dto: TopUpPointsDTO, @CurrentUser() user: CurrentUserPayload) {
        const result = await this.pointsService.topUp(id, dto.amount, dto.type, dto.note, user.id);
        return {
            data: result,
            message: 'Points added successfully',
        };
    }
}
