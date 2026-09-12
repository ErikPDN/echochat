import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGE_PACKAGE_NAME } from '@app/contracts/message/grpc/proto/message';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { MessageClientService } from './message-client.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: MESSAGE_PACKAGE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: MESSAGE_PACKAGE_NAME,
            protoPath: join(process.cwd(), 'proto/message.proto'),
            url: configService.getOrThrow('MESSAGE_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [MessageClientService],
  exports: [MessageClientService],
})
export class MessageClientModule {}
