import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsString } from "class-validator";

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
    status: string

    @IsNotEmpty()
    @IsString()
    advertiserId: string

    @IsNotEmpty()
    @IsString()
    postId: string

}