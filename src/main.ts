import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SuccessInterceptor } from './common/interceptors/success.interceptor';
import { ExceptionInterceptor } from './common/interceptors/exception.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // app.enableCors({                                                                                                                                                           
  //   origin: ['http://localhost:5173'], // your frontend URL 
  // })
  // Global success response wrapper
  app.useGlobalInterceptors(new SuccessInterceptor());
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe());
  // Global error response wrapper
  app.useGlobalFilters(new ExceptionInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
