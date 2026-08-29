import { ConversationType } from '../enums/conversation-type.enum';

export interface ConversationParticipantResponse {
  conversationId: string;
  type: ConversationType;
  members: string[];
}
