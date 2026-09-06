import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['./apps/message-service/.env', '.env'],
    }),
    MongooseModule.forRoot(process.env.MESSAGE_DATABASE_URL!),
  ],
})
export class DatabaseMessageModule {}
