import {
  Body,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ChatServiceService } from './chat-service.service';
import type { AuthenticatedRequest } from '@app/common/auth/auth-request.interface';
import { JwtAuthGuard } from '@app/common/auth/jwt-auth.guard';
import { AddUserToConversationDto } from '@app/contracts/chat/dto/add-user-to-conversation.dto';
import { ConversationResponse } from '@app/contracts/chat/interfaces/conversation-response.interface';
import {
  CreateGroupConversationDto,
  CreatePrivateConversationDto,
} from '@app/contracts';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConversationParticipantResponse } from '@app/contracts/chat/interfaces/conversation-participant-response.interface';

@Controller('conversations')
export class ChatServiceController {
  constructor(private readonly chatServiceService: ChatServiceService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getUserConversations(
    @Req() req: AuthenticatedRequest,
  ): Promise<ConversationResponse[]> {
    return this.chatServiceService.getUserConversations(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('private')
  createPrivateConversation(
    @Body() dto: CreatePrivateConversationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConversationResponse> {
    return this.chatServiceService.createPrivateConversation(
      dto,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('group')
  @UseInterceptors(FileInterceptor('file'))
  createGroupConversation(
    @Body() dto: CreateGroupConversationDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ConversationResponse> {
    return this.chatServiceService.createGroupConversation(
      dto,
      req.user.userId,
      file,
    );
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

  @Get(':conversationId/participants')
  getConversationParticipants(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ): Promise<ConversationParticipantResponse> {
    return this.chatServiceService.getConversationParticipants(conversationId);
  }
}
