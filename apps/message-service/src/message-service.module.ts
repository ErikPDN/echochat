import { Module } from '@nestjs/common';
import { MessageServiceController } from './message-service.controller';
import { MessageServiceService } from './message-service.service';
import { DatabaseMessageModule } from './database/database.module';
import { MessageSchema } from './database/schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatClientModule } from './chat-client/chat-client.module';
import { JwtAuthModule } from '@app/common/auth/jwt-auth.module';
import { CommonModule } from '@app/common';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Message', schema: MessageSchema }]),
    DatabaseMessageModule,
    ChatClientModule,
    JwtAuthModule,
    CommonModule,
  ],
  controllers: [MessageServiceController],
  providers: [MessageServiceService],
})
export class MessageServiceModule {}
