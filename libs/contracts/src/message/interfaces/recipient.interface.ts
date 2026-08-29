import { MessageStatus } from '../enums/message-status.enum';

export interface Recipient {
  userId: string;
  status: MessageStatus;
  updatedAt?: Date;
}
