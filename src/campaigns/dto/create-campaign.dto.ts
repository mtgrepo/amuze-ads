import { Type } from "class-transformer";
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

const MODEL_TYPES = ['display_ads', 'content_discovery', 'brand_campaign', 'self_service'];
export class CreateCampaignDTO {

    @IsNotEmpty()
    @IsString()
    name: string

    @IsOptional()
    @IsIn(MODEL_TYPES)
    modelType: string

    @IsNotEmpty()
    @IsNumber()
    dailyBudget: number

    @IsNotEmpty()
    @IsNumber()
    totalBudget: number

    @IsNotEmpty()
    @IsDateString()
    startDate: string

    @IsNotEmpty()
    @IsString()
    paymentMethod: string

    @IsNotEmpty()
    @IsString()
    status: string

    @IsOptional()
    @IsString()
    advertiserId?: string

    @IsOptional()
    @IsString()
    postId: string

}