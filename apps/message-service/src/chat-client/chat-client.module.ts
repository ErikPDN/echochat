import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthClientService } from 'apps/chat-service/src/auth-client/auth-client.service';

@Module({
  imports: [HttpModule],
  providers: [
    AuthClientService,
    {
      provide: 'CHAT_SERVICE_API_URL',
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow('CHAT_SERVICE_API_URL'),
      inject: [ConfigService],
    },
  ],
})
export class ChatClientModule {}
