import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TokenModule } from './token/token.module';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [TokenModule],
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class JwtAuthModule {}
