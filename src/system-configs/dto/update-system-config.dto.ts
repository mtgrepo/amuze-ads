import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateSystemConfigDTO {
    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    configKey?: string;

    @IsOptional()
    @IsObject()
    configValue?: Record<string, any>;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
