import { Type } from "class-transformer";
import { IsArray, IsIn, IsInt, Max, Min, ValidateNested } from "class-validator";
import { MAX_OBJECTIVE_TARGET, OBJECTIVE_TYPES } from "../entities/campaign-objective.entity";

export class ObjectiveInputDto {
    @IsIn(OBJECTIVE_TYPES)
    objectiveType: string;

    @IsInt()
    @Min(1)
    @Max(MAX_OBJECTIVE_TARGET)
    targetCount: number;
}

export class SaveObjectivesDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ObjectiveInputDto)
    objectives: ObjectiveInputDto[];
}
