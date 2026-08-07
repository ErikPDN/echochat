import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export const REFRESH_TOKEN_COOKIE = 'refreshToken';

@Injectable()
export class RefreshTokenCookieGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE] as
      string | undefined;

    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    return true;
  }
}
