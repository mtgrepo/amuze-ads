import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateAdSetsDTO {

    @IsNotEmpty()
    @IsString()
    campaignId: string

    @IsNotEmpty()
    @IsNumber()
    ageMin: number

    @IsNotEmpty()
    @IsNumber()
    ageMax: number

    @IsNotEmpty()
    @IsString()
    gender: string
}