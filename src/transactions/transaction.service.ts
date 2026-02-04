import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Transactions } from "./entities/transaction.entity";
import { Repository } from "typeorm";

@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(Transactions)
        private transactionRepository: Repository<Transactions>
    ) {}

    async createTransaction(transactionData: Partial<Transactions>): Promise<Transactions> {
        try {
            const transactions = this.transactionRepository.create(transactionData);
            return await this.transactionRepository.save(transactions);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

}