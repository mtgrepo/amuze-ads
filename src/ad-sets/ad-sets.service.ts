import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdSet } from "./entities/ad-sets.entity";
import { Repository } from "typeorm";
import { CreateAdSetsDTO } from "./dto/create-ad-sets.dto";
import { UpdateAdSetsDTO } from "./dto/update-ad-sets.dto";
import { ActivityService } from "src/activity/activity.service";

@Injectable()
export class AdSetsService {

    constructor(
        private readonly activity: ActivityService,
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
            const before = { ...adSet };
            Object.assign(adSet, updateData);
            return await this.activity.withHistory((manager) => manager.save(adSet), (saved) => {
                const changes = this.activity.diff(before, saved, ['ageMin', 'ageMax', 'gender']);
                return Object.keys(changes).length ? {
                    action: 'ad.audience_changed', entityType: 'ad_set', entityId: saved.id, campaignId: saved.campaignId, summary: 'Audience changed', changes,
                } : null;
            });
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
            const { id: adSetId, campaignId } = adSet;
            return await this.activity.withHistory((manager) => manager.remove(adSet), () => ({
                action: 'ad_set.deleted', entityType: 'ad_set', entityId: adSetId, campaignId, summary: 'Ad set deleted',
            }));
        } catch (error) {   
            throw new NotAcceptableException(error.message);
        }
    }
}