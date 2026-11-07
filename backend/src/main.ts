import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // En producción, FRONTEND_URL limita quién puede llamar a la API (sin "/" al final)
  app.enableCors({ origin: process.env.FRONTEND_URL ?? true });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
