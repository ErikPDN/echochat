import { NestFactory } from '@nestjs/core';
import { ChatServiceModule } from './chat-service.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(ChatServiceModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3003);
  console.log(
    `Chat Service is running on http://localhost:${process.env.PORT ?? 3003}`,
  );
}
bootstrap();
