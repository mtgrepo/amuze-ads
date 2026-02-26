import { Injectable, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Ad } from "./entities/ad.entity";
import { Repository } from "typeorm";
import { AdSet } from "src/ad-sets/entities/ad-sets.entity";
import { CreateAdSetsDTO } from "src/ad-sets/dto/create-ad-sets.dto";
import { UpdateAdSetsDTO } from "src/ad-sets/dto/update-ad-sets.dto";
import { NotificationService } from "../notifications/notification.service";

@Injectable()
export class AdService {
    constructor(
        @InjectRepository(Ad)
        private adRepository: Repository<Ad>,
        @InjectRepository(AdSet)
        private adSetRepository: Repository<AdSet>,
        private readonly notificationService: NotificationService
    ) {}

    async createAd(dto: CreateAdSetsDTO): Promise<Ad> {
        try {
            const adSet = this.adSetRepository.create(dto);
            const savedAdSet = await this.adSetRepository.save(adSet);

            const ad = this.adRepository.create({ adSetId: savedAdSet.id, status: 'pending' });
            const savedAd = await this.adRepository.save(ad);

            const adData = await this.adRepository.findOne({
                where: { id: savedAd.id },
                relations: ['adSet', 'adSet.campaign'],
            });
            if (!adData) {
                throw new NotFoundException('Ad not found');
            }
            return adData;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdList(advertiserId?: string): Promise<Ad[]> {
        try {
            // return await this.adRepository.find({ relations: ['adSet', 'adSet.campaign'], 
            // where: advertiserId
            //     ? {
            //         adSet: {
            //             campaign: {
            //                 advertiserId: advertiserId,
            //             },
            //         },
            //     }
            //     : {},
            // });
            return await this.adRepository
    .createQueryBuilder('ad')
    .leftJoinAndSelect('ad.adSet', 'adSet')
    .leftJoinAndSelect('adSet.campaign', 'campaign')
    .where(advertiserId ? 'campaign.advertiserId = :advertiserId' : '1=1', { advertiserId })
    .getMany();
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdById(id: string): Promise<Ad> {
        try {
            const ad = await this.adRepository.findOne({
                where: { id },
                relations: ['adSet', 'adSet.campaign'],
            });
            if (!ad) {
                throw new NotFoundException('Ad not found');
            }
            return ad;
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new NotAcceptableException(error.message);
        }
    }

    async updateAd(id: string, dto: UpdateAdSetsDTO): Promise<Ad> {
        try {
            const ad = await this.findAdById(id);
            Object.assign(ad.adSet, dto);
            await this.adSetRepository.save(ad.adSet);
            return await this.findAdById(id);
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new NotAcceptableException(error.message);
        }
    }

    async updateStatus(id: string, status: string): Promise<Ad> {
        try {
            const ad = await this.findAdById(id);
            ad.status = status;
            await this.adRepository.save(ad);
            const adData = await this.findAdById(id);
            await this.notificationService.createNotification({
                advertiserId: adData?.adSet?.campaign?.advertiserId,
                title: "Notification about Ad Status",
                message: `Your Ad has been ${status} !`
            })
            return adData;
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new NotAcceptableException(error.message);
        }
    }
}
