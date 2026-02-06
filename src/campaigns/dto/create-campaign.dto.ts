import { IsDateString, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateCampaignDTO {
    
    @IsNotEmpty()
    @IsString()
    name: string

    @IsNotEmpty()
    @IsString()
    objective: string

    @IsNotEmpty()
    @IsNumber()
    dailyBudget: number

    @IsNotEmpty()
    @IsNumber()
    totalBudget: number

    @IsNotEmpty()
    @IsNumber()
    spentAmount: number

    @IsNotEmpty()
    @IsDateString()
    startDate: Date

    @IsNotEmpty()
    @IsDateString()
    endDate: Date

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