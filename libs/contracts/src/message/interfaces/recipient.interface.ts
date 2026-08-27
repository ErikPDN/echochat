import { MessageStatus } from '@app/contracts';

export interface Recipient {
  userId: string;
  status: MessageStatus;
  updatedAt?: Date;
}
