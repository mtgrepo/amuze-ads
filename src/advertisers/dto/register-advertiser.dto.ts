import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";
import { ADVERTISER_TYPES } from "../advertiser-type";

/** Public self-registration: the login account plus its business profile, sent as one multipart form. */
export class RegisterAdvertiserDTO {
    // Account
    @IsIn(ADVERTISER_TYPES)
    type: "advertiser" | "agency";

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(20)
    phone: string;

    @IsString()
    @MinLength(6)
    password: string;

    // Business
    @IsNotEmpty()
    @IsString()
    business_name: string;

    @IsNotEmpty()
    @IsString()
    business_no: string;

    @IsNotEmpty()
    @IsString()
    business_type: string;

    // Agencies are registered companies; an individual advertiser may not have a DICA number.
    @ValidateIf((dto: RegisterAdvertiserDTO) => dto.type === 'agency' || !!dto.dica_number)
    @IsNotEmpty({ message: 'DICA number is required for agencies' })
    @IsString({ message: 'DICA number is required for agencies' })
    dica_number?: string;

    @IsNotEmpty()
    @IsString()
    address: string;

    @IsOptional()
    @IsString()
    website?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    timezone?: string;
}
