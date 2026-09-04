import { Injectable, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AdCreative } from "./entities/ad-creative.entity";
import { Ad } from "src/ads/entities/ad.entity";
import { CreateAdCreativeDto } from "./dto/create-ad-creative.dto";
import { UpdateAdCreativeDto } from "./dto/update-ad-creative.dto";

const NON_TERMINAL_AD_STATUSES = ['pending', 'active', 'paused'];

@Injectable()
export class AdCreativeService {
    constructor(
        @InjectRepository(AdCreative)
        private readonly adCreativeRepository: Repository<AdCreative>,
        @InjectRepository(Ad)
        private readonly adRepository: Repository<Ad>,
    ) {}

    async create(dto: CreateAdCreativeDto, assetPath: string): Promise<AdCreative> {
        try {
            const creative = this.adCreativeRepository.create({
                ...dto,
                asset: assetPath,
                status: 'active',
            });
            return await this.adCreativeRepository.save(creative);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAll(advertiserId?: string): Promise<AdCreative[]> {
        try {
            return await this.adCreativeRepository.find({
                where: advertiserId ? { advertiserId } : {},
            });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findOne(id: string): Promise<AdCreative> {
        const creative = await this.adCreativeRepository.findOneBy({ id });
        if (!creative) {
            throw new NotFoundException('Ad creative not found');
        }
        return creative;
    }

    async update(id: string, dto: UpdateAdCreativeDto, assetPath?: string): Promise<AdCreative> {
        const creative = await this.findOne(id);
        Object.assign(creative, dto);
        if (assetPath) {
            creative.asset = assetPath;
        }
        return await this.adCreativeRepository.save(creative);
    }

    async remove(id: string): Promise<AdCreative> {
        const creative = await this.findOne(id);

        const referencedByActiveAd = await this.adRepository.count({
            where: { adCreativeId: id, status: In(NON_TERMINAL_AD_STATUSES) },
        });

        if (referencedByActiveAd > 0) {
            throw new NotAcceptableException(
                'Cannot delete an ad creative that is still referenced by a pending, active, or paused ad',
            );
        }

        return await this.adCreativeRepository.remove(creative);
    }
}
