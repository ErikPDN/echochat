import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Recipient, RecipientSchema } from './recipient.schema';
import { ContentType } from '@app/contracts';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ index: true, unique: true })
  messageId!: string;

  @Prop({ index: true })
  conversationId!: string;

  @Prop({ index: true })
  senderId!: string;

  @Prop({})
  senderName!: string;

  @Prop({})
  senderUsername!: string;

  @Prop({ type: [RecipientSchema], default: [] })
  recipients!: Recipient[];

  @Prop({})
  content!: string;

  @Prop({ type: String, enum: ContentType })
  contentType!: ContentType;

  @Prop({})
  fileIds!: string[];

  createdAt!: Date;

  updatedAt!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Create an index on the conversationId and createdAt fields for efficient querying of messages within a conversation, sorted by creation time.
MessageSchema.index({ conversationId: 1, createdAt: -1 });
