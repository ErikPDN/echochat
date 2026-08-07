import { JwtAuthGuard } from '@app/common/auth/jwt-auth.guard';
import { AddUserToConversationDto } from '@app/contracts/chat/dto/add-user-to-conversation.dto';
import { CreateConversationDto } from '@app/contracts/chat/dto/create-conversation.dto';
import {
  Body,
  Controller,
  Post,
  Headers,
  UseGuards,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ConversationResponse } from '@app/contracts/chat/interfaces/conversation-response.interface';

@Controller('conversations')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createConversation(
    @Body() dto: CreateConversationDto,
    @Headers('authorization') token: string,
  ): Promise<ConversationResponse> {
    return this.chatService.createConversation(dto, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getUserConversations(
    @Headers('authorization') token: string,
  ): Promise<ConversationResponse[]> {
    return this.chatService.getUserConversations(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':conversationId/members')
  addUserToConversation(
    @Body() dto: AddUserToConversationDto,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Headers('authorization') token: string,
  ): Promise<ConversationResponse> {
    return this.chatService.addUserToConversation(dto, conversationId, token);
  }
}
