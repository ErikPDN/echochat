import { JwtAuthGuard } from '@app/common/auth/jwt-auth.guard';
import { AddUserToConversationDto } from '@app/contracts/chat/dto/add-user-to-conversation.dto';
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
import {
  CreateGroupConversationDto,
  CreatePrivateConversationDto,
} from '@app/contracts';

@Controller('conversations')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getUserConversations(
    @Headers('authorization') token: string,
  ): Promise<ConversationResponse[]> {
    return this.chatService.getUserConversations(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('private')
  createPrivateConversation(
    @Body() dto: CreatePrivateConversationDto,
    @Headers('authorization') token: string,
  ): Promise<ConversationResponse> {
    return this.chatService.createPrivateConversation(dto, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('group')
  createGroupConversation(
    @Body() dto: CreateGroupConversationDto,
    @Headers('authorization') token: string,
  ): Promise<ConversationResponse> {
    return this.chatService.createGroupConversation(dto, token);
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
