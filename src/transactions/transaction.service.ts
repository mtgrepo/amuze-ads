import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Transactions } from "./entities/transaction.entity";
import { In, Repository } from "typeorm";

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

    async findByReferenceId(referenceId: string, referenceType: string): Promise<Transactions | null> {
        try {
            return await this.transactionRepository.findOneBy({ referenceId, referenceType });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findByReferenceIds(referenceIds: string[], referenceType: string): Promise<Transactions[]> {
        try {
            if (referenceIds.length === 0) return [];
            return await this.transactionRepository.findBy({
                referenceId: In(referenceIds),
                referenceType,
            });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async updateTransactionByReference(
        referenceId: string,
        referenceType: string,
        updateData: Partial<Transactions>,
    ): Promise<Transactions> {
        try {
            let transaction = await this.transactionRepository.findOneBy({ referenceId, referenceType });
            if (!transaction) {
                transaction = this.transactionRepository.create({ referenceId, referenceType, ...updateData });
            } else {
                Object.assign(transaction, updateData);
            }
            return await this.transactionRepository.save(transaction);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

}