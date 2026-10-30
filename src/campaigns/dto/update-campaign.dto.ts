import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

/** Name any time; package, quantity and start date only while draft. The end date is always calculated. */
export class UpdateCampaignDTO {
    @IsOptional()
    @IsString()
    name?: string

    @IsOptional()
    @IsUUID()
    packageId?: string

    @IsOptional()
    @IsInt()
    @Min(1)
    packageQuantity?: number

    @IsOptional()
    @IsDateString()
    startDate?: string
}
