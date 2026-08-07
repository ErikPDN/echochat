import {
  Body,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ChatServiceService } from './chat-service.service';
import { CreateConversationDto } from '@app/contracts/chat/dto/create-conversation.dto';
import type { AuthenticatedRequest } from '@app/common/auth/auth-request.interface';
import { JwtAuthGuard } from '@app/common/auth/jwt-auth.guard';
import { AddUserToConversationDto } from '@app/contracts/chat/dto/add-user-to-conversation.dto';
import { ConversationResponse } from '@app/contracts/chat/interfaces/conversation-response.interface';

@Controller('conversations')
export class ChatServiceController {
  constructor(private readonly chatServiceService: ChatServiceService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createConversation(
    @Body() dto: CreateConversationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConversationResponse> {
    return this.chatServiceService.createConversation(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getUserConversations(
    @Req() req: AuthenticatedRequest,
  ): Promise<ConversationResponse[]> {
    return this.chatServiceService.getUserConversations(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':conversationId/members')
  addUserToConversation(
    @Body() dto: AddUserToConversationDto,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConversationResponse> {
    return this.chatServiceService.addUserToConversation(
      dto,
      conversationId,
      req.user.userId,
    );
  }
}
