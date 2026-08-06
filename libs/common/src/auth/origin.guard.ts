import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowedOrigins = process.env.FRONTEND_URL!;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin ?? request.headers.referer;

    if (!origin || !origin.startsWith(this.allowedOrigins)) return false;

    return true;
  }
}
