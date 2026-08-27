import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageDocument } from './database/schema';
import { MessageResponse, MessageStatus, SendMessageDto } from '@app/contracts';

@Injectable()
export class MessageServiceService {
  constructor(
    @InjectModel('Message')
    private readonly messageModel: Model<MessageDocument>,
    private readonly conversationService: ChatService,
  ) {}

  async sendMessage(
    message: SendMessageDto,
    senderId: string,
  ): Promise<MessageResponse> {
    if (!message.conversationId) {
      throw new BadRequestException('conversationId is required');
    }

    const conversation = await this.conversationService.getConversationById(
      message.conversationId,
    );
  }
}
