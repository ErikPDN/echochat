import { CanActivate, Injectable } from '@nestjs/common';

@Injectable()
export class GrpcAuthGuard implements CanActivate {
  constructor() {}
}
