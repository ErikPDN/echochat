import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseChatService } from './database/database.service';
import {
  AddUserToConversationDto,
  ConversationMemberResponse,
  ConversationResponse,
  ConversationType,
  CreateGroupConversationDto,
  CreatePrivateConversationDto,
  MemberRole,
} from '@app/contracts';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { ConversationMember, conversations } from './database/schema';
import { conversationMembers } from './database/schema';
import { AuthClientService } from './auth-client/auth-client.service';

@Injectable()
export class ChatServiceService {
  constructor(
    private readonly databaseChatService: DatabaseChatService,
    private readonly authClientService: AuthClientService,
  ) {}

  async getUserConversations(userId: string): Promise<ConversationResponse[]> {
    const memberships = await this.databaseChatService.db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.userId, userId),
          isNull(conversationMembers.leftAt),
        ),
      );

    if (memberships.length === 0) return [];

    const conversationIds = memberships.map(
      (membership) => membership.conversationId,
    );

    const userConversations = await this.databaseChatService.db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds));

    const allMembers = await this.databaseChatService.db
      .select()
      .from(conversationMembers)
      .where(
        and(
          inArray(conversationMembers.conversationId, conversationIds),
          isNull(conversationMembers.leftAt),
        ),
      );

    const membersByConversation = new Map<string, typeof allMembers>();
    for (const member of allMembers) {
      const list = membersByConversation.get(member.conversationId) || [];
      list.push(member);
      membersByConversation.set(member.conversationId, list);
    }

    const usersById = await this.resolveUserNames(
      allMembers.map((member) => member.userId),
    );

    return userConversations.map((conversation) => ({
      id: conversation.id,
      type: conversation.type as ConversationType,
      name: conversation.name,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      members: (membersByConversation.get(conversation.id) || []).map(
        (member) => this.buildMemberResponse(member, usersById),
      ),
    }));
  }

  async createPrivateConversation(
    dto: CreatePrivateConversationDto,
    userId: string,
  ): Promise<ConversationResponse> {
    const { memberId } = dto;

    const existingMember = await this.authClientService.verifyUsers([memberId]);

    if (existingMember.length === 0) {
      throw new NotFoundException('Member not found');
    }

    const existingPrivateConversation =
      await this.findExistingPrivateConversation(userId, memberId);

    if (existingPrivateConversation) {
      return this.getConversationById(existingPrivateConversation.id);
    }

    return this.insertConversation(
      ConversationType.PRIVATE,
      [memberId],
      userId,
    );
  }

  async createGroupConversation(
    dto: CreateGroupConversationDto,
    userId: string,
  ): Promise<ConversationResponse> {
    const uniqueMemberIds = [...new Set(dto.memberIds)].filter(
      (id) => id !== userId,
    );

    if (!dto.name || dto.name.trim() === '') {
      throw new BadRequestException('Group conversations must have a name');
    }

    const existingMembers =
      await this.authClientService.verifyUsers(uniqueMemberIds);

    if (existingMembers.length !== uniqueMemberIds.length) {
      const foundMemberIds = new Set(
        existingMembers.map((member) => member.id),
      );
      const notFoundMemberIds = uniqueMemberIds.filter(
        (id) => !foundMemberIds.has(id),
      );
      throw new NotFoundException(
        `Members not found: ${notFoundMemberIds.join(', ')}`,
      );
    }

    return this.insertConversation(
      ConversationType.GROUP,
      uniqueMemberIds,
      userId,
      dto.name,
    );
  }

  async addUserToConversation(
    dto: AddUserToConversationDto,
    conversationId: string,
    requesterId: string,
  ): Promise<ConversationResponse> {
    const [existingConversation] = await this.databaseChatService.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!existingConversation)
      throw new NotFoundException('Conversation not found');

    const existingUser = await this.authClientService.verifyUsers([dto.userId]);

    if (existingUser.length === 0) {
      throw new NotFoundException('User not found');
    }

    const [requesterMembership] = await this.databaseChatService.db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, requesterId),
          isNull(conversationMembers.leftAt),
        ),
      )
      .limit(1);

    if (!requesterMembership) {
      throw new ForbiddenException(
        'You are not a member of this conversation or have left it, so you cannot add new members',
      );
    }

    if (requesterMembership.role !== MemberRole.ADMIN) {
      throw new ForbiddenException(
        'Only admins can add new members to the conversation',
      );
    }

    const [existingMember] = await this.databaseChatService.db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, dto.userId),
        ),
      )
      .limit(1);

    if (existingMember && !existingMember.leftAt) {
      throw new ConflictException(
        'User is already a member of the conversation',
      );
    }

    if (existingConversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException(
        'Cannot add members to a private conversation',
      );
    }

    if (existingMember) {
      await this.databaseChatService.db
        .update(conversationMembers)
        .set({ leftAt: null, joinedAt: new Date(), role: MemberRole.MEMBER })
        .where(
          and(
            eq(conversationMembers.conversationId, conversationId),
            eq(conversationMembers.userId, dto.userId),
          ),
        );
    } else {
      await this.databaseChatService.db.insert(conversationMembers).values({
        conversationId,
        userId: dto.userId,
        role: MemberRole.MEMBER,
      });
    }

    const members = await this.databaseChatService.db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          isNull(conversationMembers.leftAt),
        ),
      );

    const userById = await this.resolveUserNames(
      members.map((member) => member.userId),
    );

    return {
      id: conversationId,
      type: existingConversation.type as ConversationType,
      name: existingConversation.name,
      createdAt: existingConversation.createdAt,
      updatedAt: existingConversation.updatedAt,
      members: members.map((member) =>
        this.buildMemberResponse(member, userById),
      ),
    };
  }

  async getConversationById(
    conversationId: string,
  ): Promise<ConversationResponse> {
    const [conversation] = await this.databaseChatService.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const members = await this.databaseChatService.db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          isNull(conversationMembers.leftAt),
        ),
      );

    const userById = await this.resolveUserNames(
      members.map((member) => member.userId),
    );

    return {
      id: conversation.id,
      type: conversation.type as ConversationType,
      name: conversation.name,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      members: members.map((member) =>
        this.buildMemberResponse(member, userById),
      ),
    };
  }

  private async insertConversation(
    type: ConversationType,
    participantIds: string[],
    creatorId: string,
    name?: string,
  ): Promise<ConversationResponse> {
    const result = await this.databaseChatService.db.transaction(async (tx) => {
      const [newConversation] = await tx
        .insert(conversations)
        .values({
          type,
          name: name ?? null,
        })
        .returning();

      const insertedMembers = await tx
        .insert(conversationMembers)
        .values([
          {
            conversationId: newConversation.id,
            userId: creatorId,
            role:
              type === ConversationType.GROUP
                ? MemberRole.ADMIN
                : MemberRole.MEMBER,
          },
          ...participantIds.map((memberId) => ({
            conversationId: newConversation.id,
            userId: memberId,
            role: MemberRole.MEMBER,
          })),
        ])
        .returning();

      return { ...newConversation, members: insertedMembers };
    });

    const userById = await this.resolveUserNames(
      result.members.map((member) => member.userId),
    );

    return {
      id: result.id,
      type: result.type as ConversationType,
      name: result.name,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      members: result.members.map((member) =>
        this.buildMemberResponse(member, userById),
      ),
    };
  }

  private async resolveUserNames(
    userIds: string[],
  ): Promise<Map<string, { username: string; name: string }>> {
    if (userIds.length === 0) return new Map();

    const users = await this.authClientService.verifyUsers(userIds);
    return new Map(users.map((user) => [user.id, user]));
  }

  private buildMemberResponse(
    member: ConversationMember,
    userById: Map<string, { username: string; name: string }>,
  ): ConversationMemberResponse {
    const user = userById.get(member.userId);
    return {
      userId: member.userId,
      username: user?.username ?? 'Unknown',
      name: user?.name ?? 'Unknown',
      role: member.role as MemberRole,
      joinedAt: member.joinedAt,
      leftAt: member.leftAt ?? undefined,
    };
  }

  private async findExistingPrivateConversation(
    userId1: string,
    userId2: string,
  ): Promise<{ id: string } | null> {
    const user1Conversations = await this.databaseChatService.db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversations)
      .innerJoin(
        conversationMembers,
        eq(conversations.id, conversationMembers.conversationId),
      )
      .where(
        and(
          eq(conversationMembers.userId, userId1),
          eq(conversations.type, ConversationType.PRIVATE),
          isNull(conversationMembers.leftAt),
        ),
      );

    const user1ConversationIds = user1Conversations.map(
      (conv) => conv.conversationId,
    );

    if (user1ConversationIds.length === 0) return null;

    const [match] = await this.databaseChatService.db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.userId, userId2),
          inArray(conversationMembers.conversationId, user1ConversationIds),
          isNull(conversationMembers.leftAt),
        ),
      )
      .limit(1);

    return match ? { id: match.conversationId } : null;
  }
}
