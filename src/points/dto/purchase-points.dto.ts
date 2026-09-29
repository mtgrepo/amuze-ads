import { IsInt, Max, Min } from "class-validator";
import { MAX_POINTS_PER_TRANSACTION, MIN_PURCHASE_POINTS } from "../point-types";

export class PurchasePointsDTO {
    @IsInt()
    @Min(MIN_PURCHASE_POINTS, { message: `Minimum purchase is ${MIN_PURCHASE_POINTS} points` })
    @Max(MAX_POINTS_PER_TRANSACTION, { message: `Maximum purchase is ${MAX_POINTS_PER_TRANSACTION} points` })
    amount: number;
}
