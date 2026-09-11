import { IsArray, IsUUID } from 'class-validator';

export class GetConversationsParticipantsRequestDto {
  @IsArray()
  @IsUUID('4', { each: true })
  conversationIds!: string[];
}
