import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Query, UseGuards } from "@nestjs/common";
import { ApiKeyGuard } from "./api-key.guard";
import { AdServingService } from "./ad-serving.service";
import { TrackEventDto } from "./dto/track-event.dto";

/** "Home Feed", "home-feed" and "HOME_FEED" all mean the home_feed placement. */
const normalizePlacement = (value?: string) => (value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

/** A whole number of years, or nothing when the app sends no age ("", "null", "undefined"). */
function parseAge(value?: string): number | undefined {
    const age = Number(value);
    return value?.trim() && Number.isInteger(age) && age >= 0 ? age : undefined;
}

/** male/female in any case (M/F too). Anything else matches only ads for everyone. */
function normalizeGender(value?: string): string | undefined {
    const gender = (value ?? '').trim().toLowerCase();
    if (!gender || gender === 'all' || gender === 'null' || gender === 'undefined') return undefined;
    return { m: 'male', f: 'female' }[gender] ?? gender;
}

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
        const placementKey = normalizePlacement(placement);
        if (!placementKey) {
            throw new BadRequestException('placement is required');
        }
        const result = await this.adServingService.findServableAd({
            placement: placementKey,
            age: parseAge(age),
            gender: normalizeGender(gender),
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
    async track(@Body() body: TrackEventDto) {
        await this.adServingService.trackEvent(body.adId, body.event, body.userId, body.age, body.gender);
        return {
            message: 'Event tracked',
        };
    }
}
