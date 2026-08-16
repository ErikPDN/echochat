import { pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { conversations } from './conversations';

export const conversationMembersRoleEnum = pgEnum(
  'conversation_members_role_enum',
  ['admin', 'member'],
);

export const conversationMembers = pgTable(
  'conversation_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: conversationMembersRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    leftAt: timestamp('left_at'),
  },
  (table) => [unique().on(table.conversationId, table.userId)],
);

export type NewConversationMember = typeof conversationMembers.$inferInsert;
export type ConversationMember = typeof conversationMembers.$inferSelect;
