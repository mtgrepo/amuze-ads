import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateDailyAdStatsDTO {
    @IsNotEmpty()
    @IsString()
    adId: string;

    @IsNotEmpty()
    @IsDateString()
    startDate: string;

    @IsNotEmpty()
    @IsNumber()
    impressions: number;

    @IsNotEmpty()
    @IsNumber()
    clicks: number;

    @IsNotEmpty()
    @IsNumber()
    spent: number;

    @IsOptional()
    @IsIn(['CPM', 'CPC', 'CPE'])
    pricingMode?: string;

    @IsOptional()
    @IsNumber()
    maxImpressions?: number;

    @IsOptional()
    @IsNumber()
    maxClicks?: number;

    @IsOptional()
    @IsNumber()
    maxEngagements?: number;

    @IsOptional()
    @IsNumber()
    engagements?: number;

    @IsOptional()
    @IsNumber()
    dailyBudget?: number;
}
