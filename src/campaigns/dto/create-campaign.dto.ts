import { Type } from "class-transformer";
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

const MODEL_TYPES = ['display_ads', 'content_discovery', 'brand_campaign', 'self_service'];
const TARGET_TYPES = ['post', 'ad_creative', 'profile', 'course', 'product'];

export class CreateCampaignDTO {

    @IsNotEmpty()
    @IsString()
    name: string

    @IsNotEmpty()
    @IsIn(['reach', 'traffic', 'engagement'])
    objective: string

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

    @IsNotEmpty()
    @IsString()
    advertiserId: string

    @IsNotEmpty()
    @IsString()
    postId: string

    @IsOptional()
    @IsIn(MODEL_TYPES)
    modelType?: string

    @IsOptional()
    @IsIn(TARGET_TYPES)
    targetType?: string

    @IsOptional()
    @IsString()
    targetId?: string

}