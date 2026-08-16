import { IsUUID } from 'class-validator';

export class CreatePrivateConversationDto {
  @IsUUID('4', { message: 'Member ID must be a valid UUID v4' })
  memberId!: string;
}
