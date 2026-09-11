import { NestFactory } from '@nestjs/core';
import { ChatServiceModule } from './chat-service.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { CHAT_GRPC_PACKAGE, chatProtoPath } from '@app/contracts';

async function bootstrap() {
  const app = await NestFactory.create(ChatServiceModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: CHAT_GRPC_PACKAGE,
        protoPath: chatProtoPath,
        url: process.env.CHAT_GRPC_URL ?? '0.0.0.0:50051',
        loader: { keepCase: false },
      },
    },
    { inheritAppConfig: true },
  );

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3003);
  console.log(
    `Chat Service is running on http://localhost:${process.env.PORT ?? 3003}`,
  );
}
bootstrap();
