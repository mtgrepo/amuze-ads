import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

const ASSET_TYPES = ['image', 'video'];

export class CreateAdCreativeDto {
    @IsOptional()
    @IsString()
    advertiserId?: string

    @IsNotEmpty()
    @IsString()
    name: string

    @IsNotEmpty()
    @IsIn(ASSET_TYPES)
    assetType: string

    @IsNotEmpty()
    @IsString()
    destinationLink: string
}
