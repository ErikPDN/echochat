import { Module } from '@nestjs/common';
import { ChatClientService } from './chat-client.service';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path/posix';
import { CHAT_PACKAGE_NAME } from '@app/contracts';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: CHAT_PACKAGE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: CHAT_PACKAGE_NAME,
            protoPath: join(process.cwd(), 'proto/chat.proto'),
            url: configService.getOrThrow('CHAT_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [ChatClientService],
  exports: [ChatClientService],
})
export class ChatClientModule {}
