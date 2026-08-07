import { Module } from '@nestjs/common';
import { ChatServiceController } from './chat-service.controller';
import { ChatServiceService } from './chat-service.service';
import { DatabaseChatService } from './database/database.service';

@Module({
  imports: [DatabaseChatService],
  controllers: [ChatServiceController],
  providers: [ChatServiceService],
})
export class ChatServiceModule {}
