import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
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

    @UseGuards(RolesGuard)
    @Roles('admin')
    @Get()
    async findAll() {
        const transactions = await this.transactionService.findAllTransactions();
        return {
            data: transactions,
            message: 'Transactions retrieved successfully',
        };
    }

}