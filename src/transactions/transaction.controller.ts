import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { TransactionService } from "./transaction.service";

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) {}

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