import { ContentType } from '@app/contracts';
import { Recipient } from './recipient.interface';

export interface MessageResponse {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipients: Recipient[];
  content?: string;
  contentType: ContentType;
  fileIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}
