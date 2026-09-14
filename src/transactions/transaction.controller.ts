import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
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

    @Get()
    async findAll(@CurrentUser() user: CurrentUserPayload) {
        const transactions = await this.transactionService.findAllTransactions(
            user.role === 'admin' ? undefined : user.id
        );
        return {
            data: transactions,
            message: 'Transactions retrieved successfully',
        };
    }

}