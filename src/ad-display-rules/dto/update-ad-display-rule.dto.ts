import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
import { VIDEO_POSITIONS } from "../display-rules";

/** Only the fields that belong to the slot's trigger are accepted; the service rejects the rest. */
export class UpdateAdDisplayRuleDto {
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    everyMin?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    everyMax?: number;

    /** 0 means no wait. */
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(1440)
    cooldownMinutes?: number;

    @IsOptional()
    @IsIn(VIDEO_POSITIONS)
    videoPosition?: string;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @Length(1, 50, { each: true })
    modules?: string[];
}
