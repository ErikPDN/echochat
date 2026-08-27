import { MessageStatus } from '@app/contracts';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Recipient {
  @Prop({ required: true })
  userId!: string;

  @Prop({ type: String, enum: MessageStatus, default: MessageStatus.PENDING })
  status!: MessageStatus;

  @Prop({})
  updatedAt?: Date;
}

export const RecipientSchema = SchemaFactory.createForClass(Recipient);
