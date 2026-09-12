import { ContentType, MessageGrpc, SendMessageDto } from '@app/contracts';
import {
  MESSAGE_PACKAGE_NAME,
  MessageServiceClient,
} from '@app/contracts/message/grpc/proto/message';
import { MessageResponse } from '@app/contracts/message/interfaces/message-response.interface';
import { MessageStatus } from '@app/contracts/message/enums/message-status.enum';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MessageClientService implements OnModuleInit {
  private readonly logger = new Logger(MessageClientService.name);
  private messageService: MessageServiceClient;

  constructor(
    @Inject(MESSAGE_PACKAGE_NAME) private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.messageService =
      this.client.getService<MessageServiceClient>(MESSAGE_PACKAGE_NAME);
  }

  async sendMessage(
    conversationId: string,
    message: SendMessageDto,
    token: string,
  ): Promise<MessageResponse> {
    try {
      const { messageId, content, contentType, fileIds } = message;
      const metadata = new Metadata();
      metadata.set('authorization', `Bearer ${token}`);

      const sentMessage = await firstValueFrom(
        this.messageService.sendMessage(
          {
            conversationId,
            messageId: messageId ?? undefined,
            content: content ?? undefined,
            contentType: MessageGrpc.ContentType[contentType],
            fileIds: fileIds ?? [],
          },
          metadata,
        ),
      );
      return {
        messageId: sentMessage.messageId,
        conversationId: sentMessage.conversationId,
        senderId: sentMessage.senderId,
        senderName: sentMessage.senderName,
        senderUsername: sentMessage.senderUsername,
        senderAvatarUrl: sentMessage.senderAvatarUrl ?? undefined,
        recipients: sentMessage.recipients.map((recipient) => ({
          userId: recipient.userId,
          status: MessageGrpc.MessageStatus[recipient.status] as MessageStatus,
          updatedAt: recipient.updatedAt
            ? new Date(recipient.updatedAt)
            : undefined,
        })),
        content: sentMessage.content ?? undefined,
        contentType: MessageGrpc.ContentType[
          sentMessage.contentType
        ] as ContentType,
        fileIds: sentMessage.fileIds ?? [],
        createdAt: sentMessage.createdAt
          ? new Date(sentMessage.createdAt)
          : new Date(),
        updatedAt: sentMessage.updatedAt
          ? new Date(sentMessage.updatedAt)
          : new Date(),
      };
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `Error sending message to conversation ${conversationId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
