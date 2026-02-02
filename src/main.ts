import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SuccessInterceptor } from './Common/Interceptors/success.interceptor';
import { ExceptionInterceptor } from './Common/Interceptors/exception.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Global success response wrapper
  app.useGlobalInterceptors(new SuccessInterceptor());
  // Global error response wrapper
  app.useGlobalFilters(new ExceptionInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
