import { Module } from '@nestjs/common';
import { TokenModule } from './token/token.module';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [TokenModule],
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard, TokenModule],
})
export class JwtAuthModule {}
