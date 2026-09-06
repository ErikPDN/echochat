import { JwtAuthModule } from '@app/common';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { ConfigService } from '@nestjs/config';
import { MessageController } from './message.controller';

@Module({
  imports: [HttpModule, JwtAuthModule],
  controllers: [MessageController],
  providers: [
    MessageService,
    {
      provide: 'MESSAGE_SERVICE_API_URL',
      useFactory: (configService) =>
        configService.getOrThrow('MESSAGE_SERVICE_API_URL'),
      inject: [ConfigService],
    },
  ],
})
export class MessageModule {}
