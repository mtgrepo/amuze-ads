import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdvertiserModule } from './advertisers/advertiser.module';
import { AdminUserModule } from './admin-users/admin-user.module';
import { AdvertiserProfilesModule } from './advertiser-profile/advertiser-profiles.module';
import { AuthModule } from './auth/auth.module';
import { MinioModule } from './minio/minio.module';
import { TransactionModule } from './transactions/transaction.module';
import { NotificationModule } from './notifications/notification.module';
import { AdvertiserPostsModule } from './advertiser-posts/advertiser-posts.module';
import { SystemConfigsModule } from './system-configs/system-configs.module';
import { AdModule } from './ads/ad.module';
import { DailyAdStatsModule } from './daily-ad-stats/daily-ad-stats.module';
import { CampaignModule } from './campaigns/campaign.module';
import { AdSetsModule } from './ad-sets/ad-sets.module';
import { AdCreativeModule } from './ad-creatives/ad-creative.module';
import { AdServingModule } from './ad-serving/ad-serving.module';
import { PresignedUrlInterceptor } from './common/interceptors/presigned-url.interceptor';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        autoLoadEntities: true,
        synchronize: false,
        logging: true,
      })
    }),
    MinioModule,
    AdvertiserModule,
    AdvertiserProfilesModule,
    AdminUserModule,
    AuthModule,
    TransactionModule,
    NotificationModule,
    AdvertiserPostsModule,
    SystemConfigsModule,
    AdModule,
    DailyAdStatsModule,
    CampaignModule,
    AdSetsModule,
    AdCreativeModule,
    AdServingModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PresignedUrlInterceptor,
    },
  ],
})
export class AppModule {}
