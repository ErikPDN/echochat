import { SendMessageDto } from '@app/contracts/message';
import { IsUUID } from 'class-validator';

export class WsSendMessageDto extends SendMessageDto {
  @IsUUID(4, { message: 'conversationId must be a valid UUID v4' })
  conversationId!: string;
}
