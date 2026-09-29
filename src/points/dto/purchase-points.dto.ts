import { IsInt, Min } from "class-validator";
import { MIN_PURCHASE_POINTS } from "../point-types";

export class PurchasePointsDTO {
    @IsInt()
    @Min(MIN_PURCHASE_POINTS, { message: `Minimum purchase is ${MIN_PURCHASE_POINTS} points` })
    amount: number;
}
