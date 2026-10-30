import { IsInt, IsUUID, Min } from "class-validator";

export class CreateCampaignExtensionDto {
    @IsUUID()
    campaignId: string;

    /** Units of the campaign's package to add. */
    @IsInt()
    @Min(1)
    quantity: number;
}
