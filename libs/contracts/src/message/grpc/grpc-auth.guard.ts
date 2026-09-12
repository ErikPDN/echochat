import { AuthenticatedUser, TokenService } from '@app/common';
import { Metadata, status } from '@grpc/grpc-js';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class GrpcAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = context.switchToRpc().getContext<Metadata>();
    const raw = metadata.get('authorization')?.[0]?.toString();
    if (!raw) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Authorization header is missing',
      });
    }

    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    const user: AuthenticatedUser = this.tokenService.verifyAccessToken(token);

    (
      context.switchToRpc().getContext() as { __user?: AuthenticatedUser }
    ).__user = user;

    return true;
  }
}
