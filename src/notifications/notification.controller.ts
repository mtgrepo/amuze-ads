import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CreateNotificationDTO } from "./dto/create-notification.dto";

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Post()
    async create(@Body() notificationData: CreateNotificationDTO) {
        const notification = await this.notificationService.createNotification(notificationData);
        return {
            data: notification,
            message: 'Notification created successfully',
        }
    }

    @Get(':advertiserId')
    async findByAdvertiser(@Param('advertiserId') advertiserId: string) {
        const notifications = await this.notificationService.findNotificationsByAdvertiser(advertiserId);
        return {
            data: notifications,
            message: 'Notifications retrieved successfully',
        }
    }
    
    @Patch('read/:notificationId')
    async markAsRead(@Param('notificationId') notificationId: string) {
        const notification = await this.notificationService.markAsRead(notificationId);
        return {
            data: notification,
            message: 'Notification marked as read successfully',
        }
    }

    @Patch('read-all/:advertiserId')
    async markAllAsRead(@Param('advertiserId') advertiserId: string) {
        const notifications = await this.notificationService.markAsAllRead(advertiserId);
        return {
            data: notifications,
            message: 'All notifications marked as read successfully',
        }
    }

}