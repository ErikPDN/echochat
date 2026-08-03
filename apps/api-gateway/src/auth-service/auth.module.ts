import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { JwtAuthModule } from '@app/common/auth/jwt-auth.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [HttpModule, JwtAuthModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: 'AUTHORIZER_API_URL',
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow('AUTHORIZER_API_URL'),
      inject: [ConfigService],
    },
  ],
})
export class AuthModule {}
