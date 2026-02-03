import { IsBoolean, IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateAdminUserDTO {
    
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

}