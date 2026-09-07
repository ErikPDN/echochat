import { Injectable } from '@nestjs/common';

@Injectable()
export class WsGatewayService {
  getHello(): string {
    return 'Hello World!';
  }
}
