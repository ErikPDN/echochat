import { ForbiddenException, Injectable } from '@nestjs/common';
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
    const memberIds = await this.assertMembership(
      message.conversationId,
      senderId,
    );

    const messageId = message.messageId ?? randomUUID();
    const recipientIds = memberIds.filter((id) => id !== senderId);

    const newMessage = await this.messageModel.create({
      ...message,
      messageId,
      senderId,
      recipients: recipientIds.map((id) => ({ userId: id })),
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

  async listMessages(
    conversationId: string,
    userId: string,
  ): Promise<MessageResponse[]> {
    await this.assertMembership(conversationId, userId);

    const messages = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: -1 });

    return messages.map((message) => ({
      messageId: message.messageId,
      conversationId: message.conversationId,
      senderId: message.senderId,
      recipients: message.recipients,
      content: message.content,
      contentType: message.contentType,
      fileIds: message.fileIds,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    }));
  }

  private async assertMembership(
    conversationId: string,
    userId: string,
  ): Promise<string[]> {
    const conversation =
      await this.conversationService.getConversationParticipants(
        conversationId,
      );

    if (!conversation.members.includes(userId)) {
      throw new ForbiddenException('User is not a member of the conversation');
    }

    return conversation.members;
  }
}
