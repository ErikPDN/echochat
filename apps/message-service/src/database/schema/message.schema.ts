import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema()
export class Message {
  @Prop({ index: true, unique: true })
  messageId: string;

  @Prop({ index: true })
  conversationId: string;

  @Prop({ index: true })
  senderId: string;

  @Prop({})
  recipientsIds: string[];

  @Prop({})
  content: string;

  @Prop({})
  contentType: ContentType;

  @Prop({})
  filesIds: string[];

  @Prop({})
  messageStatus: MessageStatus;

  @Prop({})
  createdAt: Date;

  @Prop({})
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
