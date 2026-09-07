import { Injectable, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Ad } from "./entities/ad.entity";
import { Repository } from "typeorm";
import { AdSet } from "src/ad-sets/entities/ad-sets.entity";
import { UpdateAdSetsDTO } from "src/ad-sets/dto/update-ad-sets.dto";
import { CreateAdDto } from "./dto/create-ad.dto";
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

    async createAd(dto: CreateAdDto): Promise<Ad> {
        try {
            const ad = this.adRepository.create({
                adSetId: dto.adSetId,
                adCreativeId: dto.adCreativeId,
                adType: dto.adType,
                placementKey: dto.placementKey,
                status: 'pending',
            });
            const savedAd = await this.adRepository.save(ad);

            return savedAd;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdList(advertiserId?: string): Promise<Ad[]> {
        try {
            return await this.adRepository.find({
                where: advertiserId ? { adSet: { campaign: { advertiserId } } } : {},
                relations: ['adSet', 'adSet.campaign', 'adCreative'],
            });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdById(id: string): Promise<Ad> {
        try {
            const ad = await this.adRepository.findOne({
                where: { id },
                relations: ['adSet', 'adSet.campaign', 'adCreative'],
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

    async approveAd(id: string): Promise<Ad> {
        const ad = await this.findAdById(id);
        if (ad.status !== 'pending') {
            throw new NotAcceptableException('Only pending ads can be approved');
        }
        return this.updateStatus(id, 'active');
    }

    async rejectAd(id: string): Promise<Ad> {
        const ad = await this.findAdById(id);
        if (ad.status !== 'pending') {
            throw new NotAcceptableException('Only pending ads can be rejected');
        }
        return this.updateStatus(id, 'rejected');
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
