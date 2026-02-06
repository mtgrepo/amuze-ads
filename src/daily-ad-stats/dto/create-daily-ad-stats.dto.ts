import { IsDateString, IsNotEmpty, IsNumber, IsString } from "class-validator";

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
}
