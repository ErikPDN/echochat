import { ConversationType } from '@app/contracts';

export interface ConversationParticipantResponse {
  conversationId: string;
  type: ConversationType;
  members: string[];
}
