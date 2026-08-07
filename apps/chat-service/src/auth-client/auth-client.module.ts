import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthClientService } from './auth-client.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [HttpModule],
  providers: [
    AuthClientService,
    {
      provide: 'AUTHORIZER_API_URL',
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow('AUTHORIZER_API_URL'),
      inject: [ConfigService],
    },
  ],
  exports: [AuthClientService],
})
export class AuthClientModule {}
