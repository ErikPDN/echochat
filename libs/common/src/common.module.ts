import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { AllExceptionsFilter } from './filters';
import { APP_FILTER } from '@nestjs/core';

@Module({
  providers: [
    CommonService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [CommonService],
})
export class CommonModule {}
