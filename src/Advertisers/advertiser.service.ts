import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Advertiser } from "./entities/advertiser.entity";
import { hashPassword } from "src/common/utils/password.utils";

@Injectable()
export class AdvertiserService {
    constructor(
        @InjectRepository(Advertiser)
        private advertiserRepository: Repository<Advertiser>,
    ) {}

    async createAdvertiser(advertiserData: Partial<Advertiser>): Promise<Advertiser> {
        try {
            if (advertiserData.password) {
                advertiserData.password = await hashPassword(advertiserData.password);
            }
            const advertiser = this.advertiserRepository.create(advertiserData);
            return await this.advertiserRepository.save(advertiser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdvertiserList(): Promise<Advertiser[]> {
        try {
            return await this.advertiserRepository.find();
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdvertiserByEmail(email: string): Promise<Advertiser | null> {
        try {
            return await this.advertiserRepository.findOneBy({ email });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdvertiserById(id: string): Promise<Advertiser> {
        try {
            const advertiser = await this.advertiserRepository.findOne({ where: { id }, relations: ['profiles'] });
            if (!advertiser) {
                throw new NotAcceptableException("Advertiser not found");
            }
            return advertiser;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async updateAdvertiser(id: string, updateData: Partial<Advertiser>): Promise<Advertiser> {
        try {
            const advertiser = await this.findAdvertiserById(id);
            if (!advertiser) {
                throw new NotAcceptableException("Advertiser not found");
            }
            if (updateData.password) {
                updateData.password = await hashPassword(updateData.password);
            }
            Object.assign(advertiser, updateData);
            return await this.advertiserRepository.save(advertiser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async changeVerifyStatus(id: string, verified: boolean): Promise<Advertiser> {
        try {
            const advertiser = await this.findAdvertiserById(id);
            if (!advertiser) {
                throw new NotAcceptableException("Advertiser not found");
            }
            advertiser.verified = verified;
            return await this.advertiserRepository.save(advertiser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async changeActiveStatus(id: string, status: string): Promise<Advertiser> {
        try {
            const advertiser = await this.findAdvertiserById(id);
            if (!advertiser) {
                throw new NotAcceptableException("Advertiser not found");
            }
            advertiser.status = status;
            return await this.advertiserRepository.save(advertiser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async deleteAdvertiser(id: string): Promise<Advertiser> {
        try {
            const advertiser = await this.findAdvertiserById(id);
            if (!advertiser) {
                throw new NotAcceptableException("Advertiser not found");
            }
            return await this.advertiserRepository.remove(advertiser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }
}