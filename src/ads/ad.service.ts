import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Ad } from "./entities/ad.entity";
import { Repository } from "typeorm";

@Injectable()
export class AdService {
    constructor(
        @InjectRepository(Ad)
        private adRepository: Repository<Ad>
    ) {}

    async createAd(adData: Partial<Ad>): Promise<Ad> {
        try {
            const ad = this.adRepository.create(adData);
            return await this.adRepository.save(ad);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdList(): Promise<Ad[]> {
        try {
            const ads = await this.adRepository.find({ relations: ['adSet', 'adSet.campaign'] });
            return ads;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdById(id: string): Promise<Ad> {
        try {
            const ad = await this.adRepository.findOneBy({ id });
            if (!ad) {
                throw new NotAcceptableException("Ad not found");
            }
            return ad;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async updateStatus(id: string, status: string): Promise<Ad> {
        try {
            const ad = await this.findAdById(id);
            if (!ad) {
                throw new NotAcceptableException("Ad not found");
            }
            ad.status = status;
            return await this.adRepository.save(ad);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

}