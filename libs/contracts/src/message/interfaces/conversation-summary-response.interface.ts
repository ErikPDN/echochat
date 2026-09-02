export interface ConversationSummaryResponse {
  conversationId: string;
  lastMessage: {
    messageId: string;
    content?: string;
    contentType: string;
    senderId: string;
    senderName: string;
    createdAt: Date;
  } | null;
  unreadCount: number;
}
