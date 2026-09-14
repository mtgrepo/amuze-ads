import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transactions } from "./entities/transaction.entity";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { TransactionService } from "./transaction.service";
import { TransactionController } from "./transaction.controller";


@Module({
  imports: [
    TypeOrmModule.forFeature([Transactions, Campaign])
  ],
  providers: [TransactionService],
  controllers: [TransactionController],
  exports: [TransactionService]
})
export class TransactionModule {}