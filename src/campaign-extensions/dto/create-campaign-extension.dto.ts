import { IsNotEmpty, IsString, IsUUID, Matches } from "class-validator";

export class CreateCampaignExtensionDto {
    @IsUUID()
    campaignId: string;

    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'newEndDate must look like 2026-10-31' })
    newEndDate: string;
}
