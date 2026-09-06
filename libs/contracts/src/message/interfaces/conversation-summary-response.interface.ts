import { LastMessageSummary } from './last-message-summary.interface';

export interface ConversationSummaryResponse {
  conversationId: string;
  lastMessage: LastMessageSummary | null;
  unreadCount: number;
}
