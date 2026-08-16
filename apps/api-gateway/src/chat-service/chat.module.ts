import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { HttpModule } from '@nestjs/axios';
import { JwtAuthModule } from '@app/common/auth/jwt-auth.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [HttpModule, JwtAuthModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: 'CHAT_SERVICE_API_URL',
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow('CHAT_SERVICE_API_URL'),
      inject: [ConfigService],
    },
  ],
})
export class ChatModule {}
