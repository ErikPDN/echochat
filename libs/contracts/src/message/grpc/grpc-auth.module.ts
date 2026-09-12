import { Module } from '@nestjs/common';
import { TokenModule } from '@app/common';
import { GrpcAuthGuard } from './grpc-auth.guard';

@Module({
  imports: [TokenModule],
  providers: [GrpcAuthGuard],
  exports: [GrpcAuthGuard, TokenModule],
})
export class GrpcAuthModule {}
