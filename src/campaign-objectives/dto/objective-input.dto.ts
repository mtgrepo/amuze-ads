import { Type } from "class-transformer";
import { IsArray, IsIn, IsInt, Min, ValidateNested } from "class-validator";
import { OBJECTIVE_TYPES } from "../entities/campaign-objective.entity";

export class ObjectiveInputDto {
    @IsIn(OBJECTIVE_TYPES)
    objectiveType: string;

    @IsInt()
    @Min(1)
    targetCount: number;
}

export class SaveObjectivesDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ObjectiveInputDto)
    objectives: ObjectiveInputDto[];
}
