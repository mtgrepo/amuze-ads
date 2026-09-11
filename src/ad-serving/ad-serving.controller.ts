import { Body, Controller, Get, NotFoundException, Post, Query, UseGuards } from "@nestjs/common";
import { ApiKeyGuard } from "./api-key.guard";
import { AdServingService } from "./ad-serving.service";

@UseGuards(ApiKeyGuard)
@Controller('ad-serving')
export class AdServingController {
    constructor(private readonly adServingService: AdServingService) {}

    @Get()
    async serve(
        @Query('placement') placement: string,
        @Query('age') age?: string,
        @Query('gender') gender?: string,
    ) {
        const result = await this.adServingService.findServableAd({
            placement,
            age: age ? parseInt(age, 10) : undefined,
            gender,
        });

        if (!result) {
            throw new NotFoundException('No servable ad for this placement/targeting');
        }

        return {
            data: result,
            message: 'Servable ad found',
        };
    }

    @Post('track')
    async track(@Body() body: { adId: string; event: string }) {
        await this.adServingService.trackEvent(body.adId, body.event);
        return {
            message: 'Event tracked',
        };
    }
}
