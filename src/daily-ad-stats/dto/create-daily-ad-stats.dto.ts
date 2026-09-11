import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

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

    @IsOptional()
    @IsNumber()
    engagements?: number;
}
