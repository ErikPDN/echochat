import { Controller, Get } from '@nestjs/common';
import { WsGatewayService } from './ws-gateway.service';

@Controller()
export class WsGatewayController {
  constructor(private readonly wsGatewayService: WsGatewayService) {}

  @Get()
  getHello(): string {
    return this.wsGatewayService.getHello();
  }
}
