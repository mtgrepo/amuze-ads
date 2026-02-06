import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdvertiserAdStats } from "./entities/daily-ad-stats.entity";
import { Repository } from "typeorm";

@Injectable()
export class DailyAdStatsService {
    constructor(
        @InjectRepository(AdvertiserAdStats)
        private readonly advertiserAdStatsRepository: Repository<AdvertiserAdStats>
    ) {}

    async create(adStatsData: Partial<AdvertiserAdStats>): Promise<AdvertiserAdStats> {
        try {
            const adStats = this.advertiserAdStatsRepository.create(adStatsData);
            return await this.advertiserAdStatsRepository.save(adStats);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findByAdId(adId: string): Promise<AdvertiserAdStats[]> {
        try {
            const stats = await this.advertiserAdStatsRepository.findBy({ adId });
            return stats;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findByDateRange(adId: string, startDate: Date, endDate: Date): Promise<AdvertiserAdStats[]> {
        try {
            const status = await this.advertiserAdStatsRepository.createQueryBuilder("stats")
                .where("stats.adId = :adId", { adId })
                .andWhere("stats.startDate BETWEEN :startDate AND :endDate", { startDate, endDate });
            return await status.getMany();
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

}