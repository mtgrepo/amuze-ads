import { IsBoolean, IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateAdvertiserDTO {
    
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