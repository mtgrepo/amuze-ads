import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsString } from "class-validator";
import { ADVERTISER_TYPES } from "../advertiser-type";

export class CreateAdvertiserDTO {

    @IsIn(ADVERTISER_TYPES)
    type: "advertiser" | "agency";
    
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsNotEmpty()
    @IsString()
    phone: string;

    @IsNotEmpty()
    @IsString()
    status: string;

    @IsBoolean()
    verified: boolean;

    @IsString()
    @IsNotEmpty()
    password: string;

}