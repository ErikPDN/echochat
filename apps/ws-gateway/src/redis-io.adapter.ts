import { TokenService } from '@app/common';
import { INestApplicationContext, UnauthorizedException } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, ServerOptions } from 'socket.io';
import { createClient } from 'redis';
import { IoAdapter } from '@nestjs/platform-socket.io';

export { IoAdapter } from '@nestjs/platform-socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly tokenService: TokenService,
  ) {
    super(app);
  }

  async connectToRedis(url: string): Promise<void> {
    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);

    server.use((socket, next) => {
      try {
        const raw =
          (socket.handshake.auth?.token as string | undefined) ??
          socket.handshake.headers.authorization;

        if (!raw) throw new Error('missing token');
        const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
        socket.data.user = this.tokenService.verifyAccessToken(token);
        socket.data.token = token;
        next();
      } catch {
        next(new UnauthorizedException('Unauthorized'));
      }
    });

    return server;
  }
}
