import { IsIn, IsNotEmpty, IsString } from "class-validator";
import { AD_TYPES, PLACEMENT_KEYS } from "../ad-formats";


export class CreateAdDto {
    @IsNotEmpty()
    @IsString()
    adSetId: string

    @IsNotEmpty()
    @IsString()
    adCreativeId: string

    @IsNotEmpty()
    @IsIn(AD_TYPES)
    adType: string

    @IsNotEmpty()
    @IsIn(PLACEMENT_KEYS)
    placementKey: string
}
