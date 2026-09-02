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
    const membersByConversation = await this.assertMemberships(
      conversationIds,
      userId,
    );

    const rows = await this.messageModel.aggregate<{
      _id: string;
      lastMessage: MessageDocument;
      unreadCount: number;
    }>([
      { $match: { conversationId: { $in: conversationIds } } },
      { $sort: { conversationId: 1, createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $anyElementTrue: {
                    $map: {
                      input: '$recipients',
                      as: 'r',
                      in: {
                        $and: [
                          { $eq: ['$$r.userId', userId] },
                          { $ne: ['$$r.status', MessageStatus.READ] },
                        ],
                      },
                    },
                  },
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const byConversation = new Map(rows.map((r) => [r._id, r]));

    return conversationIds.map((conversationId) => {
      const row = byConversation.get(conversationId);
      if (!row) {
        return { conversationId, lastMessage: null, unreadCount: 0 };
      }

      const membersById = this.indexMembers(
        membersByConversation.get(conversationId) ?? [],
      );
      const sender = membersById.get(row.lastMessage.senderId);

      return {
        conversationId,
        lastMessage: {
          messageId: row.lastMessage.messageId,
          content: row.lastMessage.content,
          contentType: row.lastMessage.contentType,
          senderId: row.lastMessage.senderId,
          senderName: sender?.name ?? row.lastMessage.senderName,
          createdAt: row.lastMessage.createdAt,
        },
        unreadCount: row.unreadCount,
      };
    });
  }

  private async assertMembership(
    conversationId: string,
    userId: string,
  ): Promise<MemberResponse[]> {
    const byConversation = await this.assertMemberships(
      [conversationId],
      userId,
    );
    return byConversation.get(conversationId) ?? [];
  }

  private async assertMemberships(
    conversationIds: string[],
    userId: string,
  ): Promise<Map<string, MemberResponse[]>> {
    const conversations =
      await this.conversationService.getConversationsParticipants(
        conversationIds,
      );

    const membersByConversation = new Map(
      conversations.map((c) => [c.conversationId, c.members]),
    );

    for (const conversationId of conversationIds) {
      const members = membersByConversation.get(conversationId);
      if (!members?.some((member) => member.userId === userId)) {
        throw new ForbiddenException(
          `User ${userId} is not a member of conversation ${conversationId}`,
        );
      }
    }

    return membersByConversation;
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
