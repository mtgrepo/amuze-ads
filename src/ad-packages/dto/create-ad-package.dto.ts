import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateAdPackageDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    name: string;

    @IsInt()
    @Min(1)
    @Max(366)
    durationDays: number;

    @IsInt()
    @Min(1)
    price: number;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsInt()
    sortOrder?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
