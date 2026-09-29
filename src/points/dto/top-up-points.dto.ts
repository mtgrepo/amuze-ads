import { IsIn, IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class TopUpPointsDTO {
    @IsInt()
    @Min(1)
    amount: number;

    // paid: customer paid offline (revenue). bonus: promotional (not revenue).
    @IsIn(['paid', 'bonus'])
    type: 'paid' | 'bonus';

    @IsString()
    @IsNotEmpty()
    note: string;
}
