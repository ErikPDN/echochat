import { NestFactory } from '@nestjs/core';
import { MessageServiceModule } from './message-service.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { MESSAGE_PACKAGE_NAME } from '@app/contracts/message/grpc/proto/message';

async function bootstrap() {
  const app = await NestFactory.create(MessageServiceModule);

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
        package: MESSAGE_PACKAGE_NAME,
        protoPath: join(process.cwd(), 'proto/message.proto'),
        url: process.env.MESSAGE_GRPC_URL ?? 'localhost:50052',
      },
    },
    { inheritAppConfig: true },
  );

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3004);
  console.log(
    `Message Service is running on http://localhost:${process.env.PORT ?? 3004}`,
  );
}
bootstrap();
