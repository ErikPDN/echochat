import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const conversationTypeEnum = pgEnum('conversation_type_enum', [
  'private',
  'group',
]);

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: conversationTypeEnum('type').notNull(),
  name: varchar('name', { length: 255 }),
  avatarKey: varchar('avatar_key', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type NewConversation = typeof conversations.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
