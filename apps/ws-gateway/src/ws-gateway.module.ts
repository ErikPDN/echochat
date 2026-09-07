import { WsGatewayController } from './ws-gateway.controller';
import { WsGatewayService } from './ws-gateway.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [WsGatewayController],
  providers: [WsGatewayService],
})
export class WsGatewayModule {}
