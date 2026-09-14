import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Transactions } from "./entities/transaction.entity";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { In, Repository } from "typeorm";

@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(Transactions)
        private transactionRepository: Repository<Transactions>,
        @InjectRepository(Campaign)
        private campaignRepository: Repository<Campaign>,
    ) {}

    async findAllTransactions(advertiserId?: string) {
        try {
            const transactions = await this.transactionRepository.find({
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

            const campaignIds = transactions
                .filter(t => t.referenceType === 'campaign')
                .map(t => t.referenceId);

            const campaigns = campaignIds.length > 0
                ? await this.campaignRepository.findBy({ id: In(campaignIds) })
                : [];
            const campaignMap = new Map(campaigns.map(c => [c.id, { id: c.id, name: c.name }]));

            return transactions.map(t => ({
                id: t.id,
                amount: t.amount,
                paymentMethod: t.paymentMethod,
                referenceType: t.referenceType,
                referenceId: t.referenceId,
                createdAt: t.createdAt,
                advertiser: t.advertiser,
                campaign: campaignMap.get(t.referenceId) ?? null,
            }));
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

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