import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

// Same rule as registration.
const MIN_PASSWORD = 6;
const MAX_PASSWORD = 128;

export class ChangePasswordDTO {
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @IsString()
    @MinLength(MIN_PASSWORD)
    @MaxLength(MAX_PASSWORD)
    newPassword: string;
}

export class ForgotPasswordDTO {
    @IsEmail()
    @MaxLength(255)
    email: string;
}

export class ResetPasswordDTO {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    token: string;

    @IsString()
    @MinLength(MIN_PASSWORD)
    @MaxLength(MAX_PASSWORD)
    newPassword: string;
}
