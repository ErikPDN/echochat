import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseAuthModule } from './database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthModule } from '@app/common/auth';
import { CommonModule } from '@app/common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['./apps/auth-service/.env', '.env'],
    }),
    DatabaseAuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: Number(process.env.JWT_EXPIRATION!) },
    }),
    JwtAuthModule,
    CommonModule,
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
