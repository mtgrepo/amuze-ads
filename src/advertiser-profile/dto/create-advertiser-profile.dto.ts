import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateAdvertiserProfileDto {
    @IsNotEmpty() 
    @IsString()
    advertiser_id: string;

    @IsNotEmpty()
    @IsString()
    business_name: string;

    @IsNotEmpty()
    @IsString()
    business_no: string;

    @IsNotEmpty()
    @IsString()
    business_type: string;

    // Required for agencies only; AdvertiserProfilesService checks the owner's account type.
    @IsOptional()
    @IsString()
    dica_number?: string;

    @IsOptional()
    @IsString()
    website?: string;

    @IsNotEmpty()
    @IsString()
    address: string;

    @IsNotEmpty()
    @IsString()
    country: string;

    @IsNotEmpty()
    @IsString()
    timezone: string;

}
