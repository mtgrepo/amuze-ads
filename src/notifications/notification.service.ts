import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { Repository } from "typeorm";

@Injectable()
export class NotificationService {
    constructor (
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
    ) {}

    async createNotification(notificationData: Partial<Notification>): Promise<Notification> {
        try {
            const notification = this.notificationRepository.create(notificationData);
            return await this.notificationRepository.save(notification);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findNotificationsByAdvertiser(advertiserId: string): Promise<Notification[]> {
        try {
            return await this.notificationRepository.find({
                where: { advertiserId: advertiserId }
            });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async markAsRead(notificationId: string): Promise<Notification> {
        try {
            const notification = await this.notificationRepository.findOneBy({ id: notificationId });
            if(!notification) {
                throw new NotAcceptableException("Notification not found");
            }
            notification.read = true;
            return await this.notificationRepository.save(notification);
        } catch (error) {   
            throw new NotAcceptableException(error.message);
        }
    }

    async markAsAllRead(advertiserId: string): Promise<Notification[]> {
        try {
            const notifications = await this.notificationRepository.find({
                where: { advertiserId: advertiserId, read: false }
            })

            for (const notification of notifications) {
                notification.read = true;
                await this.notificationRepository.save(notification);
            }

            return notifications

        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

}