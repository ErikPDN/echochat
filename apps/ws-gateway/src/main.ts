import { NestFactory } from '@nestjs/core';
import { WsGatewayModule } from './ws-gateway.module';
import { RedisIoAdapter } from './redis-io.adapter';
import { TokenService } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(WsGatewayModule);

  const redisAdapter = new RedisIoAdapter(app, app.get(TokenService));
  await redisAdapter.connectToRedis(
    process.env.REDIS_URL ?? 'redis://localhost:6379',
  );
  app.useWebSocketAdapter(redisAdapter);

  await app.listen(process.env.PORT ?? 3005);
  console.log(
    `WebSocket Gateway is running on http://localhost:${process.env.PORT ?? 3005}`,
  );
}
bootstrap();
