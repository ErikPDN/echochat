import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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
import {
  Conversation,
  ConversationMember,
  conversations,
} from './database/schema';
import { conversationMembers } from './database/schema';
import { AuthClientService } from './auth-client/auth-client.service';
import { StorageService } from '@app/common';
import { UserInternalResponse } from '@app/contracts/auth/interfaces/user-internal-response.interface';
import { randomUUID } from 'crypto';
import { ConversationParticipantResponse } from '@app/contracts/chat/interfaces/conversation-participant-response.interface';

@Injectable()
export class ChatServiceService {
  private readonly logger: Logger = new Logger(ChatServiceService.name);

  constructor(
    private readonly databaseChatService: DatabaseChatService,
    private readonly authClientService: AuthClientService,
    private readonly storageService: StorageService,
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

    const usersById = await this.resolveUserNames([
      ...new Set(allMembers.map((member) => member.userId)),
    ]);

    return userConversations.map((conversation) => {
      const members = membersByConversation.get(conversation.id) || [];
      const otherUserAvatarKey = this.resolveOtherUserAvatarKey(
        members,
        usersById,
        userId,
      );

      const otherUserName = this.resolveOtherUserName(
        members,
        usersById,
        userId,
      );

      return {
        id: conversation.id,
        type: conversation.type as ConversationType,
        name: this.resolveConversationName(
          conversation.type as ConversationType,
          conversation.name,
          otherUserName,
        ),
        avatarUrl: this.resolveAvatarUrl(
          conversation.type as ConversationType,
          otherUserAvatarKey,
          conversation.avatarKey,
        ),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        members: members.map((member) =>
          this.buildMemberResponse(member, usersById),
        ),
      };
    });
  }

  async createPrivateConversation(
    dto: CreatePrivateConversationDto,
    userId: string,
  ): Promise<ConversationResponse> {
    const { memberId } = dto;

    if (memberId === userId) {
      throw new BadRequestException(
        'Cannot create a private conversation with yourself',
      );
    }

    const existingMember = await this.authClientService.verifyUsers([memberId]);

    if (existingMember.length === 0) {
      throw new NotFoundException('Member not found');
    }

    const existingPrivateConversation =
      await this.findExistingPrivateConversation(userId, memberId);

    if (existingPrivateConversation) {
      return this.getConversationById(existingPrivateConversation.id, userId);
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
    file?: Express.Multer.File,
  ): Promise<ConversationResponse> {
    const uniqueMemberIds = [...new Set(dto.memberIds)].filter(
      (id) => id !== userId,
    );

    if (!dto.groupName || dto.groupName.trim() === '') {
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
      dto.groupName,
      file,
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
      try {
        await this.databaseChatService.db.insert(conversationMembers).values({
          conversationId,
          userId: dto.userId,
          role: MemberRole.MEMBER,
        });
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          throw new ConflictException(
            'User is already a member of the conversation',
          );
        }
        throw error;
      }
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
    userId: string,
  ): Promise<ConversationResponse> {
    const { conversation, members } =
      await this.fetchConversationWithMembers(conversationId);

    const userById = await this.resolveUserNames(
      members.map((member) => member.userId),
    );

    const otherUserAvatarKey = this.resolveOtherUserAvatarKey(
      members,
      userById,
      userId,
    );

    const otherUserName = this.resolveOtherUserName(members, userById, userId);

    return {
      id: conversation.id,
      type: conversation.type as ConversationType,
      name: this.resolveConversationName(
        conversation.type as ConversationType,
        conversation.name,
        otherUserName,
      ),
      avatarUrl: this.resolveAvatarUrl(
        conversation.type as ConversationType,
        otherUserAvatarKey,
        conversation.avatarKey,
      ),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      members: members,
    };
  }

  async getConversationParticipants(
    conversationId: string,
  ): Promise<ConversationParticipantResponse> {
    const { conversation, members } =
      await this.fetchConversationWithMembers(conversationId);

    return {
      conversationId: conversation.id,
      type: conversation.type as ConversationType,
      members: members.map((member) => {
        return {
          userId: member.userId,
          username: member.username,
          name: member.name,
          avatarUrl: member.avatarUrl ?? null,
        };
      }),
    };
  }

  private async insertConversation(
    type: ConversationType,
    participantIds: string[],
    creatorId: string,
    name?: string,
    file?: Express.Multer.File,
  ): Promise<ConversationResponse> {
    const conversationId = crypto.randomUUID();
    let key: string | null = null;

    if (file && type === ConversationType.GROUP) {
      const ext = file.originalname.split('.').pop();
      key = `${conversationId}/${randomUUID()}.${ext}`;
      await this.storageService.upload(
        'avatars',
        key,
        file.buffer,
        file.mimetype,
      );
    }

    let result: Conversation & { members: ConversationMember[] };
    try {
      result = await this.databaseChatService.db.transaction(async (tx) => {
        const [newConversation] = await tx
          .insert(conversations)
          .values({
            id: conversationId,
            type,
            name: name ?? null,
            avatarKey: key,
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
    } catch (error) {
      if (key) {
        await this.storageService
          .delete('avatars', key)
          .catch((cleanupErr) =>
            this.logger.error(
              `Failed to clean up orphaned avatar ${key}`,
              cleanupErr,
            ),
          );
      }
      throw error;
    }

    const userById = await this.resolveUserNames(
      result.members.map((member) => member.userId),
    );

    const otherUserAvatarKey = this.resolveOtherUserAvatarKey(
      result.members,
      userById,
      creatorId,
    );

    const otherUserName = this.resolveOtherUserName(
      result.members,
      userById,
      creatorId,
    );

    return {
      id: result.id,
      type: result.type as ConversationType,
      name: this.resolveConversationName(
        result.type as ConversationType,
        result.name,
        otherUserName,
      ),
      avatarUrl: this.resolveAvatarUrl(
        result.type as ConversationType,
        otherUserAvatarKey,
        result.avatarKey,
      ),
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      members: result.members.map((member) =>
        this.buildMemberResponse(member, userById),
      ),
    };
  }

  private async resolveUserNames(
    userIds: string[],
  ): Promise<Map<string, UserInternalResponse>> {
    if (userIds.length === 0) return new Map();

    const users = await this.authClientService.verifyUsers(userIds);
    return new Map(users.map((user) => [user.id, user]));
  }

  private buildMemberResponse(
    member: ConversationMember,
    userById: Map<string, UserInternalResponse>,
  ): ConversationMemberResponse {
    const user = userById.get(member.userId);
    return {
      userId: member.userId,
      username: user?.username ?? 'Unknown',
      name: user?.name ?? 'Unknown',
      role: member.role as MemberRole,
      joinedAt: member.joinedAt,
      leftAt: member.leftAt ?? undefined,
      avatarUrl: user?.avatarKey
        ? this.storageService.getPublicUrl('avatars', user.avatarKey)
        : null,
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

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    );
  }

  private resolveAvatarUrl(
    conversationType: ConversationType,
    otherUserAvatarKey?: string,
    avatarKey?: string | null,
  ) {
    if (conversationType === ConversationType.PRIVATE) {
      return otherUserAvatarKey
        ? this.storageService.getPublicUrl('avatars', otherUserAvatarKey)
        : null;
    }

    return avatarKey
      ? this.storageService.getPublicUrl('avatars', avatarKey)
      : null;
  }

  private resolveOtherUserName(
    members: Array<{ userId: string }>,
    userById: Map<string, UserInternalResponse>,
    currentUserId: string,
  ): string | null {
    const otherMember = members.find(
      (member) => member.userId !== currentUserId,
    );
    if (!otherMember) return null;
    return userById.get(otherMember.userId)?.name ?? 'Unknown';
  }

  private resolveOtherUserAvatarKey(
    members: Array<{ userId: string }>,
    userById: Map<string, UserInternalResponse>,
    currentUserId: string,
  ): string | undefined {
    const otherMember = members.find(
      (member) => member.userId !== currentUserId,
    );
    return otherMember
      ? (userById.get(otherMember.userId)?.avatarKey ?? undefined)
      : undefined;
  }

  private async fetchConversationWithMembers(conversationId: string) {
    const [conversation] = await this.databaseChatService.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation) throw new NotFoundException('Conversation not found');

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
      conversation,
      members: members.map((member) =>
        this.buildMemberResponse(member, userById),
      ),
    };
  }

  private resolveConversationName(
    conversationType: ConversationType,
    conversationName: string | null,
    otherUserName: string | null,
  ): string | null {
    if (conversationType === ConversationType.PRIVATE) {
      return otherUserName ?? 'Unknown';
    }
    return conversationName;
  }
}
