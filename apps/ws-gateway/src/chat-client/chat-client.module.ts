import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ChatClientService } from './chat-client.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [HttpModule],
  providers: [
    ChatClientService,
    {
      provide: 'CHAT_SERVICE_API_URL',
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow('CHAT_SERVICE_API_URL'),
      inject: [ConfigService],
    },
  ],
  exports: [ChatClientService],
})
export class ChatClientModule {}
