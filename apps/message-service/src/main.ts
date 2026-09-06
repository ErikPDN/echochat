import { NestFactory } from '@nestjs/core';
import { MessageServiceModule } from './message-service.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(MessageServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3004);
  console.log(
    `Message Service is running on http://localhost:${process.env.PORT ?? 3004}`,
  );
}
bootstrap();
