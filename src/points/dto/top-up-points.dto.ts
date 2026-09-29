import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";
import { MAX_POINTS_PER_TRANSACTION } from "../point-types";

export class TopUpPointsDTO {
    @IsInt()
    @Min(1)
    @Max(MAX_POINTS_PER_TRANSACTION, { message: `Maximum top-up is ${MAX_POINTS_PER_TRANSACTION} points` })
    amount: number;

    // paid: customer paid offline (revenue). bonus: promotional (not revenue).
    @IsIn(['paid', 'bonus'])
    type: 'paid' | 'bonus';

    @IsString()
    @IsNotEmpty()
    note: string;
}
