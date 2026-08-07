import { Module } from '@nestjs/common';
import { ChatServiceController } from './chat-service.controller';
import { ChatServiceService } from './chat-service.service';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthModule } from '@app/common/auth/jwt-auth.module';
import { CommonModule } from '@app/common/common.module';
import { DatabaseChatModule } from './database/database.module';
import { AuthClientModule } from './auth-client/auth-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['./apps/chat-service/.env', '.env'],
    }),
    DatabaseChatModule,
    JwtAuthModule,
    CommonModule,
    AuthClientModule,
  ],
  controllers: [ChatServiceController],
  providers: [ChatServiceService],
})
export class ChatServiceModule {}
