import { IsIn, IsNotEmpty, IsString } from "class-validator";

const AD_TYPES = ['banner', 'interstitial', 'reward_video', 'native', 'splash'];
const PLACEMENT_KEYS = ['home_page', 'comic', 'novel', 'story_tellings', 'magazine'];

export class CreateAdDto {
    @IsNotEmpty()
    @IsString()
    adSetId: string

    @IsNotEmpty()
    @IsString()
    adCreativeId: string

    @IsNotEmpty()
    @IsIn(AD_TYPES)
    adType: string

    @IsNotEmpty()
    @IsIn(PLACEMENT_KEYS)
    placementKey: string
}
