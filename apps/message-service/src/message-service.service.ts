import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageDocument } from './database/schema';
import { MessageResponse, MessageStatus, SendMessageDto } from '@app/contracts';
import { ChatClientService } from './chat-client/chat-client.service';
import { randomUUID } from 'crypto';
import { MemberResponse } from '@app/contracts/chat/interfaces/conversation-participant-response.interface';
import { ConversationSummaryResponse } from '@app/contracts/message/interfaces/conversation-summary-response.interface';

@Injectable()
export class MessageServiceService {
  constructor(
    @InjectModel('Message')
    private readonly messageModel: Model<MessageDocument>,
    private readonly conversationService: ChatClientService,
  ) {}

  async sendMessage(
    conversationId: string,
    message: SendMessageDto,
    senderId: string,
  ): Promise<MessageResponse> {
    const members = await this.assertMembership(conversationId, senderId);

    const messageId = message.messageId ?? randomUUID();
    const recipientIds = members
      .map((member) => member.userId)
      .filter((id) => id !== senderId);

    const sender = members.find((member) => member.userId === senderId);

    const newMessage = await this.messageModel.create({
      ...message,
      messageId,
      conversationId,
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
      .sort({ createdAt: 1 });

    return messages.map((message) =>
      this.toMessageResponse(message, membersById),
    );
  }

  async getSummary(
    conversationIds: string[],
    userId: string,
  ): Promise<ConversationSummaryResponse[]> {
    const membersByConversation = await this.fetchMemberships(conversationIds);

    const allowedIds = conversationIds.filter((id) =>
      this.isMember(membersByConversation.get(id), userId),
    );

    if (allowedIds.length === 0) return [];

    const lastReadAtByConversation = new Map(
      allowedIds.map((id) => [
        id,
        new Date(
          membersByConversation.get(id)!.find((m) => m.userId === userId)!
            .lastReadAt,
        ),
      ]),
    );

    const [lastMessageRows, unreadRows] = await Promise.all([
      this.messageModel.aggregate<{
        _id: string;
        lastMessage: MessageDocument;
      }>([
        { $match: { conversationId: { $in: allowedIds } } },
        { $sort: { conversationId: 1, createdAt: -1 } },
        {
          $group: { _id: '$conversationId', lastMessage: { $first: '$$ROOT' } },
        },
      ]),
      this.messageModel.aggregate<{ _id: string; unreadCount: number }>([
        {
          $match: {
            senderId: { $ne: userId },
            $or: allowedIds.map((id) => ({
              conversationId: id,
              createdAt: { $gt: lastReadAtByConversation.get(id) },
            })),
          },
        },
        { $group: { _id: '$conversationId', unreadCount: { $sum: 1 } } },
      ]),
    ]);

    const lastMessageByConversation = new Map(
      lastMessageRows.map((r) => [r._id, r.lastMessage]),
    );
    const unreadByConversation = new Map(
      unreadRows.map((r) => [r._id, r.unreadCount]),
    );

    return allowedIds.map((conversationId) => {
      const lastMessage = lastMessageByConversation.get(conversationId);
      if (!lastMessage) {
        return { conversationId, lastMessage: null, unreadCount: 0 };
      }

      const membersById = this.indexMembers(
        membersByConversation.get(conversationId) ?? [],
      );
      const sender = membersById.get(lastMessage.senderId);

      return {
        conversationId,
        lastMessage: {
          messageId: lastMessage.messageId,
          content: lastMessage.content,
          contentType: lastMessage.contentType,
          senderId: lastMessage.senderId,
          senderName: sender?.name ?? lastMessage.senderName,
          createdAt: lastMessage.createdAt,
        },
        unreadCount: unreadByConversation.get(conversationId) ?? 0,
      };
    });
  }

  private async assertMembership(
    conversationId: string,
    userId: string,
  ): Promise<MemberResponse[]> {
    const byConversation = await this.fetchMemberships([conversationId]);
    const members = byConversation.get(conversationId);

    if (!this.isMember(members, userId)) {
      throw new ForbiddenException(
        `User ${userId} is not a member of conversation ${conversationId}`,
      );
    }

    return members!;
  }

  private async fetchMemberships(
    conversationIds: string[],
  ): Promise<Map<string, MemberResponse[]>> {
    const conversations =
      await this.conversationService.getConversationsParticipants(
        conversationIds,
      );

    return new Map(
      conversations.map((conversation) => [
        conversation.conversationId,
        conversation.members,
      ]),
    );
  }

  private indexMembers(members: MemberResponse[]): Map<string, MemberResponse> {
    return new Map(members.map((member) => [member.userId, member]));
  }

  private isMember(
    members: MemberResponse[] | undefined,
    userId: string,
  ): boolean {
    return members?.some((member) => member.userId === userId) ?? false;
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
