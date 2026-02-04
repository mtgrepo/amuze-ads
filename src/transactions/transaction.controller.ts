import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { TransactionService } from "./transaction.service";
import { CreateTransactionDTO } from "./dto/create-transaction.dto";

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) {}

    @Post()
    async create(@Body() transactionData: CreateTransactionDTO) {
        const transaction = await this.transactionService.createTransaction(transactionData);
        return {
            data: transaction,
            message: 'Transaction created successfully',
        };
    }

}