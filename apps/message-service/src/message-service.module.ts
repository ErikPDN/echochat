import { Module } from '@nestjs/common';
import { MessageServiceController } from './message-service.controller';
import { MessageServiceService } from './message-service.service';
import { DatabaseMessageModule } from './database/database.module';
import { MessageSchema } from './database/schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Message', schema: MessageSchema }]),
    DatabaseMessageModule,
  ],
  controllers: [MessageServiceController],
  providers: [MessageServiceService],
})
export class MessageServiceModule {}
