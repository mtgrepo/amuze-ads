import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdSet } from "./entities/ad-sets.entity";
import { Repository } from "typeorm";
import { CreateAdSetsDTO } from "./dto/create-ad-sets.dto";
import { UpdateAdSetsDTO } from "./dto/update-ad-sets.dto";

@Injectable()
export class AdSetsService {

    constructor(
        @InjectRepository(AdSet)
        private adSetRepository: Repository<AdSet>,
    ) {}

    async createAdSet (adSetData: CreateAdSetsDTO) {
        try {
            const adSet = await this.adSetRepository.create(adSetData);
            return await this.adSetRepository.save(adSet);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    } 

    async findAdSetsList (): Promise<AdSet[]> {
        try {
            const data = await this.adSetRepository.find({ relations: ['campaign'] });
            return data;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdSetById (id: string): Promise<AdSet> {
        try {
            const data = await this.adSetRepository.findOneBy({ id });
            if (!data) {
                throw new Error('Ad set not found');
            }
            return data;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async updateAdSet (id: string, updateData: UpdateAdSetsDTO) : Promise<AdSet> {
        try {
            const adSet = await this.findAdSetById(id);
            if(!adSet) {
                throw new Error('Ad set not found');
            }
            Object.assign(adSet, updateData);
            return await this.adSetRepository.save(adSet);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async deleteAdSet (id: string) {
        try {
            const adSet = await this.findAdSetById(id);
            if(!adSet) {
                throw new Error('Ad set not found');
            }
            return await this.adSetRepository.remove(adSet);
        } catch (error) {   
            throw new NotAcceptableException(error.message);
        }
    }
}