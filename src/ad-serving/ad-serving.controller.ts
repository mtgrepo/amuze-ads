import { BadRequestException, Body, Controller, Get, Logger, NotFoundException, Post, Query, UseGuards } from "@nestjs/common";
import { AD_TYPES, type AdType } from "src/ads/ad-formats";
import { ApiKeyGuard } from "./api-key.guard";
import { AdServingService } from "./ad-serving.service";
import { AdDisplayRulesService } from "src/ad-display-rules/ad-display-rules.service";
import { TrackEventDto } from "./dto/track-event.dto";

/** "Home Feed", "home-feed" and "HOME_FEED" all mean home_feed. Used for placements and ad types. */
const normalizeKey = (value?: string) => (value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

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
    private readonly logger = new Logger(AdServingController.name);

    constructor(
        private readonly adServingService: AdServingService,
        private readonly displayRules: AdDisplayRulesService,
    ) {}

    /**
     * When to show each ad slot and how often. The app loads this at launch and applies it itself; cooldowns and
     * item counts live in the app and start again when the app restarts. Slots that are switched off are left out.
     */
    @Get('rules')
    async rules() {
        return {
            data: { cooldownResets: 'app_start', rules: await this.displayRules.forApp() },
            message: 'Display rules',
        };
    }

    /**
     * One ad for the slot the app is about to fill. Several ad types share a placement (home_feed has a banner,
     * an interstitial and a native slot), so the app sends `type` to get an ad it can show right now.
     */
    @Get()
    async serve(
        @Query('placement') placement: string,
        @Query('type') type?: string,
        @Query('age') age?: string,
        @Query('gender') gender?: string,
    ) {
        const placementKey = normalizeKey(placement);
        if (!placementKey) {
            throw new BadRequestException('placement is required');
        }
        const adType = normalizeKey(type);
        if (adType && !AD_TYPES.includes(adType as AdType)) {
            throw new BadRequestException(`type must be one of: ${AD_TYPES.join(', ')}`);
        }
        if (!adType) {
            // Kept for app versions that don't send a type yet; they may get any type in this placement.
            this.logger.warn(`Ad requested for ${placementKey} without a type`);
        }
        const result = await this.adServingService.findServableAd({
            placement: placementKey,
            adType: adType || undefined,
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
