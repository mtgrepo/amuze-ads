import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Transactions } from "./entities/transaction.entity";
import { Repository } from "typeorm";

/**
 * Money received. Rows are written only by PointsService, together with the points they paid for:
 * a customer's points purchase or an admin's paid top-up.
 */
@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(Transactions)
        private transactionRepository: Repository<Transactions>,
    ) {}

    async findAllTransactions(advertiserId?: string) {
        try {
            return await this.transactionRepository.find({
                where: advertiserId ? { advertiserId } : {},
                relations: ['advertiser'],
                select: {
                    id: true,
                    amount: true,
                    paymentMethod: true,
                    referenceType: true,
                    referenceId: true,
                    createdAt: true,
                    advertiser: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }
}
