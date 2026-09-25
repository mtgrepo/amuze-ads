import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from "class-validator";
import { ADVERTISER_TYPES } from "../advertiser-type";
import type { AdvertiserType } from "../advertiser-type";

export class CreateAccountDTO {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsIn(ADVERTISER_TYPES)
    type: AdvertiserType;

    // Only meaningful for type 'advertiser': makes it a client of this agency.
    @IsOptional()
    @IsUUID()
    agencyId?: string;

    // Required unless the account is an agency client.
    @ValidateIf((o) => !o.agencyId || o.email)
    @IsEmail()
    email?: string;

    @ValidateIf((o) => !o.agencyId)
    @IsString()
    @IsNotEmpty()
    password?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsNotEmpty()
    @IsString()
    status: string;

    @IsBoolean()
    verified: boolean;
}
