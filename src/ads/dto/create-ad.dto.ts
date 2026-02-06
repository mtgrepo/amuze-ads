import { IsNotEmpty, IsString } from "class-validator";

export class CreateAdDTO {
    @IsNotEmpty()
    @IsString()
    adSetId: string;

    @IsNotEmpty()
    @IsString()
    status: string;

}