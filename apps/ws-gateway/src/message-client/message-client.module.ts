import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MessageClientService } from './message-client.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [HttpModule],
  providers: [
    MessageClientService,
    {
      provide: 'MESSAGE_SERVICE_API_URL',
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow('MESSAGE_SERVICE_API_URL'),
      inject: [ConfigService],
    },
  ],
  exports: [MessageClientService],
})
export class MessageClientModule {}
