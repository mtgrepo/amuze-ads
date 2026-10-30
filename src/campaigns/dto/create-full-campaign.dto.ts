import { IsDateString, IsIn, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID } from "class-validator";
import { AD_TYPES, PLACEMENT_KEYS } from "src/ads/ad-formats";

const ASSET_TYPES = ['image', 'video'];
const GENDERS = ['male', 'female', 'all'];

export class CreateFullCampaignDto {
    @IsOptional()
    @IsString()
    advertiserId?: string

    @IsNotEmpty()
    @IsString()
    name: string

    @IsUUID()
    packageId: string

    // Multipart sends text; the service checks it's a whole number ≥ 1.
    @IsNotEmpty()
    @IsNumberString()
    packageQuantity: string

    @IsNotEmpty()
    @IsDateString()
    startDate: string

    /** JSON list of { objectiveType, targetCount }; omitted or empty means no objectives. */
    @IsOptional()
    @IsString()
    objectives?: string

    @IsNotEmpty()
    @IsString()
    creativeName: string

    @IsNotEmpty()
    @IsIn(ASSET_TYPES)
    assetType: string

    @IsNotEmpty()
    @IsString()
    destinationLink: string

    @IsNotEmpty()
    @IsNumberString()
    ageMin: string

    @IsNotEmpty()
    @IsNumberString()
    ageMax: string

    @IsNotEmpty()
    @IsIn(GENDERS)
    gender: string

    @IsNotEmpty()
    @IsIn(AD_TYPES)
    adType: string

    @IsNotEmpty()
    @IsIn(PLACEMENT_KEYS)
    placementKey: string
}
