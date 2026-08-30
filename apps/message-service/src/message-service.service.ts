import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageDocument } from './database/schema';
import { MessageResponse, SendMessageDto } from '@app/contracts';
import { ChatClientService } from './chat-client/chat-client.service';
import { randomUUID } from 'crypto';
import { MemberResponse } from '@app/contracts/chat/interfaces/conversation-participant-response.interface';

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
    const members = await this.assertMembership(
      message.conversationId,
      senderId,
    );

    const messageId = message.messageId ?? randomUUID();
    const recipientIds = members
      .map((member) => member.userId)
      .filter((id) => id !== senderId);

    const sender = members.find((member) => member.userId === senderId);

    const newMessage = await this.messageModel.create({
      ...message,
      messageId,
      senderId,
      senderName: sender?.name,
      senderUsername: sender?.username,
      recipients: recipientIds.map((id) => ({ userId: id })),
    });

    return this.toMessageResponse(newMessage, this.indexMembers(members));
  }

  async listMessages(
    conversationId: string,
    userId: string,
  ): Promise<MessageResponse[]> {
    const members = await this.assertMembership(conversationId, userId);
    const membersById = this.indexMembers(members);

    const messages = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: -1 });

    return messages.map((message) =>
      this.toMessageResponse(message, membersById),
    );
  }

  private async assertMembership(
    conversationId: string,
    userId: string,
  ): Promise<MemberResponse[]> {
    const conversation =
      await this.conversationService.getConversationParticipants(
        conversationId,
      );

    if (!conversation.members.some((member) => member.userId === userId)) {
      throw new ForbiddenException('User is not a member of the conversation');
    }

    return conversation.members;
  }

  private indexMembers(members: MemberResponse[]): Map<string, MemberResponse> {
    return new Map(members.map((member) => [member.userId, member]));
  }

  private toMessageResponse(
    message: MessageDocument,
    membersById: Map<string, MemberResponse>,
  ): MessageResponse {
    const sender = membersById.get(message.senderId);

    return {
      messageId: message.messageId,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: sender?.name ?? message.senderName,
      senderUsername: sender?.username ?? message.senderUsername,
      senderAvatarUrl: sender?.avatarUrl ?? null,
      recipients: message.recipients,
      content: message.content,
      contentType: message.contentType,
      fileIds: message.fileIds,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
