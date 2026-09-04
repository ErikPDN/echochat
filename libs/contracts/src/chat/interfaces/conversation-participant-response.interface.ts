import { ConversationType } from '../enums/conversation-type.enum';

export interface MemberResponse {
  userId: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  lastReadAt: Date;
}

export interface ConversationParticipantResponse {
  conversationId: string;
  type: ConversationType;
  members: MemberResponse[];
}
