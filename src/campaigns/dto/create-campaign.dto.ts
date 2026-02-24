import { Type } from "class-transformer";
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

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

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    spentAmount: number

    @IsNotEmpty()
    @IsDateString()
    startDate: string

    @IsNotEmpty()
    @IsDateString()
    endDate: string

    @IsNotEmpty()
    @IsString()
    status: string

    @IsNotEmpty()
    @IsString()
    advertiserId: string

    @IsNotEmpty()
    @IsString()
    postId: string

}