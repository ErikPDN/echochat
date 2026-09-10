import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../auth-request.interface';
import { JwtPayload } from '../jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  verifyAccessToken(token: string): AuthenticatedUser {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return { userId: payload.sub, username: payload.username };
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
