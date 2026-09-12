import {
  MessageServiceController,
  MessageServiceControllerMethods,
  SendMessageRequest,
} from '@app/contracts/message/grpc/proto/message';
import { Controller } from '@nestjs/common';
import { MessageServiceService } from './message-service.service';
import { TokenService } from '@app/common';
import { Metadata, status } from '@grpc/grpc-js';
import { MessageGrpc, SendMessageDto } from '@app/contracts/message';
import { RpcException } from '@nestjs/microservices';

@Controller()
@MessageServiceControllerMethods()
export class MessageServiceGrpcController implements MessageServiceController {
  constructor(
    private readonly messageService: MessageServiceService,
    private readonly tokenService: TokenService,
  ) {}

  async sendMessage(
    request: SendMessageRequest,
    metadata?: Metadata,
  ): Promise<MessageGrpc.SendMessageResponse> {
    const senderId = this.authenticate(metadata);

    const dto: SendMessageDto = {
      messageId: request.messageId,
      content: request.content,
      contentType: request.contentType,
      fileIds: request.fileIds,
    };

    try {
      const message = await this.messageService.sendMessage();
      return toGrpcResponse();
    } catch (err) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: (err as Error).message,
      });
    }
  }

  private authenticate(metadata?: Metadata): string {
    const raw = metadata?.get('authorization')?.[0]?.toString();
    if (!raw) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'missing token',
      });
    }
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    return this.tokenService.verifyAccessToken(token).userId;
  }
}

function fromGrpcContentType(ct: MessageGrpc.ContentType): DomainContentType {
  return MessageGrpc.ContentType[ct] as DomainContentType;
}
function toGrpcContentType(ct: DomainContentType): MessageGrpc.ContentType {
  return MessageGrpc.ContentType[ct as keyof typeof MessageGrpc.ContentType];
}
function toGrpcStatus(s: DomainMessageStatus): MessageGrpc.MessageStatus {
  return MessageGrpc.MessageStatus[s as keyof typeof MessageGrpc.MessageStatus];
}

function toGrpcResponse(
  message: Awaited<ReturnType<MessageServiceService['sendMessage']>>,
): MessageGrpc.SendMessageResponse {
  return {
    ...message,
    contentType: toGrpcContentType(message.contentType),
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    recipients: message.recipients.map((r) => ({
      userId: r.userId,
      status: toGrpcStatus(r.status),
      updatedAt: r.updatedAt?.toISOString(),
    })),
  };
}
