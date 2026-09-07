import { NestFactory } from '@nestjs/core';
import { WsGatewayModule } from './ws-gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(WsGatewayModule);
  await app.listen(process.env.port ?? 3005);
  console.log(
    `WebSocket Gateway is running on http://localhost:${process.env.port ?? 3005}`,
  );
}
bootstrap();
