import { IsNotEmpty, IsString } from "class-validator";

export class CreateNotificationDTO {
    @IsNotEmpty()
    @IsString()
    advertiserId: string;

    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    message: string;
}