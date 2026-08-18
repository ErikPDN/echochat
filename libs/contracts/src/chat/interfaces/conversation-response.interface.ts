import { ConversationType } from '../enums/conversation-type.enum';
import { MemberRole } from '../enums/member-role.enum';

export interface ConversationMemberResponse {
  userId: string;
  username: string;
  name: string;
  role: MemberRole;
  joinedAt: Date;
  leftAt?: Date;
  avatarKey?: string | null;
}

export interface ConversationResponse {
  id: string;
  type: ConversationType;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: ConversationMemberResponse[];
}
