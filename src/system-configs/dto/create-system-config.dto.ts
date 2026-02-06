import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateSystemConfigDTO {
    @IsNotEmpty()
    @IsString()
    category: string;

    @IsNotEmpty()
    @IsString()
    configKey: string;

    @IsNotEmpty()
    @IsObject()
    configValue: Record<string, any>;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
