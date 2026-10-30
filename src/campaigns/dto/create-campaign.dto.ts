import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from "class-validator";

const MODEL_TYPES = ['display_ads', 'content_discovery', 'brand_campaign', 'self_service'];
export class CreateCampaignDTO {

    @IsNotEmpty()
    @IsString()
    name: string

    @IsOptional()
    @IsIn(MODEL_TYPES)
    modelType: string

    @IsUUID()
    packageId: string

    @IsInt()
    @Min(1)
    packageQuantity: number

    @IsNotEmpty()
    @IsDateString()
    startDate: string

    @IsOptional()
    @IsString()
    advertiserId?: string

}
