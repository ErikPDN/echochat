import { Global, Module } from '@nestjs/common';
import { DatabaseChatService } from './database.service';

@Global()
@Module({
  providers: [DatabaseChatService],
  exports: [DatabaseChatService],
})
export class DatabaseChatModule {}
