import { AuthenticatedUser } from '@app/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';

export const GrpcUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = (
      context.switchToRpc().getContext() as { __user?: AuthenticatedUser }
    ).__user;

    if (!user) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'GrpcUser usado sem GrpcAuthGuard aplicado no handler',
      });
    }

    return user;
  },
);
