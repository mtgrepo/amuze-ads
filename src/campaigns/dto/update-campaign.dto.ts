import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateCampaignDTO {
    @IsOptional()
    @IsString()
    name?: string

    @IsOptional()
    @IsIn(['daily', 'total'])
    budgetPlan?: string

    @IsOptional()
    @IsNumber()
    @Min(0)
    dailyBudget?: number

    @IsOptional()
    @IsNumber()
    @Min(1)
    totalBudget?: number

    @IsOptional()
    @IsDateString()
    startDate?: string

    @IsOptional()
    @IsDateString()
    endDate?: string
}
