import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateTransactionDTO {
    @IsNotEmpty() 
    @IsString()
    advertiserId: string;

    @IsNotEmpty()
    @IsString()
    paymentMethod: string;

    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsNotEmpty()
    @IsString()
    referenceType: string;

    @IsNotEmpty()
    @IsString()
    referenceId: string;
}
