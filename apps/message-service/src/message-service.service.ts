import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageDocument } from './database/schema';
import { MessageResponse, SendMessageDto } from '@app/contracts';
import { ChatClientService } from './chat-client/chat-client.service';
import { randomUUID } from 'crypto';

@Injectable()
export class MessageServiceService {
  constructor(
    @InjectModel('Message')
    private readonly messageModel: Model<MessageDocument>,
    private readonly conversationService: ChatClientService,
  ) {}

  async sendMessage(
    message: SendMessageDto,
    senderId: string,
  ): Promise<MessageResponse> {
    const conversation =
      await this.conversationService.getConversationParticipants(
        message.conversationId,
      );

    const senderIsMember = conversation.members.includes(senderId);
    if (!senderIsMember) {
      throw new ForbiddenException(
        'Sender is not a member of the conversation',
      );
    }

    const memberIds = conversation.members.filter((id) => id !== senderId);
    const messageId = message.messageId ?? randomUUID();
    const newMessage = await this.messageModel.create({
      ...message,
      messageId,
      senderId,
      recipients: memberIds.map((id) => ({ userId: id })),
    });

    return {
      messageId: newMessage.messageId,
      conversationId: newMessage.conversationId,
      senderId: newMessage.senderId,
      recipients: newMessage.recipients,
      content: newMessage.content,
      contentType: newMessage.contentType,
      fileIds: newMessage.fileIds,
      createdAt: newMessage.createdAt,
      updatedAt: newMessage.updatedAt,
    };
  }
}
