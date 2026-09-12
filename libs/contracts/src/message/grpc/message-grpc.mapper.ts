import {
  ContentType,
  MessageGrpc,
  MessageResponse,
  SendMessageDto,
} from '@app/contracts';

export class MessageGrpcMapper {
  static toDto(request: MessageGrpc.SendMessageRequest): SendMessageDto {
    return {
      messageId: request.messageId,
      content: request.content,
      contentType: MessageGrpc.ContentType[request.contentType] as ContentType,
      fileIds: request.fileIds,
    };
  }

  static toResponse(message: MessageResponse): MessageGrpc.SendMessageResponse {
    return {
      ...message,
      senderAvatarUrl: message.senderAvatarUrl ?? undefined,
      contentType:
        MessageGrpc.ContentType[
          message.contentType as keyof typeof MessageGrpc.ContentType
        ],
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      recipients: message.recipients.map((recipient) => ({
        userId: recipient.userId,
        status:
          MessageGrpc.MessageStatus[
            recipient.status as keyof typeof MessageGrpc.MessageStatus
          ],
        updatedAt: recipient.updatedAt?.toISOString(),
      })),
      fileIds: message.fileIds ?? [],
    };
  }
}
