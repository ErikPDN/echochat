import { Global, Module } from '@nestjs/common';
import { DatabaseAuthService } from './database.service';

@Global()
@Module({
  providers: [DatabaseAuthService],
  exports: [DatabaseAuthService],
})
export class DatabaseAuthModule {}
