import { IsNotEmpty, IsString } from "class-validator";

export class CreateAdvertiserPostDto {
    @IsNotEmpty()
    @IsString()
    advertiser_id: string

    @IsNotEmpty()
    @IsString()
    title: string

    @IsNotEmpty()
    @IsString()
    description: string

    @IsNotEmpty()
    @IsString()
    status: string
}
