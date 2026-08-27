import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageDocument } from './database/schema';

@Injectable()
export class MessageServiceService {
  constructor(
    @InjectModel('Message') private messageModel: Model<MessageDocument>,
  ) {}
}
