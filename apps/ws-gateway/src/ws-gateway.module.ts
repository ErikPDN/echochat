import { TokenModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessageClientModule } from './message-client/message-client.module';
import { ChatClientModule } from './chat-client/chat-client.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', './apps/ws-gateway/.env'],
    }),
    TokenModule,
    MessageClientModule,
    ChatClientModule,
  ],
  providers: [ChatGateway],
})
export class WsGatewayModule {}
