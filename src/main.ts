import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SuccessInterceptor } from './common/interceptors/success.interceptor';
import { ExceptionInterceptor } from './common/interceptors/exception.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const DEFAULT_CORS_ORIGINS = [
    'http://localhost:5173',
    'https://uat-portal.ad.amuze.com.mm',
    'https://uat-customer.ad.amuze.com.mm',
  ];
  const corsOrigins = process.env.CORS_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : DEFAULT_CORS_ORIGINS,
  });
  // Global success response wrapper
  app.useGlobalInterceptors(new SuccessInterceptor());
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe());
  // Global error response wrapper
  app.useGlobalFilters(new ExceptionInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
