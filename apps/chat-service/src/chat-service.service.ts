import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseChatService } from './database/database.service';
import {
  AddUserToConversationDto,
  ConversationResponse,
  ConversationType,
  CreateConversationDto,
  MemberRole,
} from '@app/contracts';
import { eq, inArray } from 'drizzle-orm';
import { conversations } from './database/schema';
import { conversationMembers } from './database/schema';
import { AuthClientService } from './auth-client/auth-client.service';

@Injectable()
export class ChatServiceService {
  constructor(
    private readonly databaseChatService: DatabaseChatService,
    private readonly authClientService: AuthClientService,
  ) {}

  async createConversation(
    dto: CreateConversationDto,
    userId: string,
  ): Promise<ConversationResponse> {
    const uniqueMemberIds = [...new Set(dto.memberIds)].filter(
      (id) => id !== userId,
    );

    const existingMembers =
      await this.authClientService.verifyUsers(uniqueMemberIds);

    if (existingMembers.length !== uniqueMemberIds.length) {
      const foundMemberIds = new Set(existingMembers);
      const notFoundMemberIds = uniqueMemberIds.filter(
        (id) => !foundMemberIds.has(id),
      );
      throw new NotFoundException(
        `Members not found: ${notFoundMemberIds.join(', ')}`,
      );
    }

    if (dto.type === ConversationType.PRIVATE && uniqueMemberIds.length !== 1) {
      throw new BadRequestException(
        'Private conversations must have exactly one member',
      );
    }

    if (
      dto.type === ConversationType.GROUP &&
      (!dto.name || dto.name.trim() === '')
    ) {
      throw new BadRequestException('Group conversations must have a name');
    }

    const result = await this.databaseChatService.db.transaction(async (tx) => {
      const [newConversation] = await tx
        .insert(conversations)
        .values({
          type: dto.type,
          name: dto.name ?? null,
        })
        .returning();

      const insertedMembers = await tx
        .insert(conversationMembers)
        .values([
          {
            conversationId: newConversation.id,
            userId,
            role: MemberRole.ADMIN,
          },
          ...uniqueMemberIds.map((memberId) => ({
            conversationId: newConversation.id,
            userId: memberId,
            role: MemberRole.MEMBER,
          })),
        ])
        .returning();

      return { ...newConversation, members: insertedMembers };
    });

    return {
      id: result.id,
      type: result.type as ConversationType,
      name: result.name,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      members: result.members.map((member) => ({
        userId: member.userId,
        role: member.role as MemberRole,
        joinedAt: member.joinedAt,
      })),
    };
  }

  async getUserConversations(userId: string): Promise<ConversationResponse[]> {}

  async addUserToConversation(
    dto: AddUserToConversationDto,
  ): Promise<ConversationResponse> {}
}
