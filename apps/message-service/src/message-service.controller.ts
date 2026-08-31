import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessageServiceService } from './message-service.service';
import { MessageResponse, SendMessageDto } from '@app/contracts';
import type { AuthenticatedRequest } from '@app/common';
import { JwtAuthGuard } from '@app/common';

@Controller('conversations')
export class MessageServiceController {
  constructor(private readonly messageServiceService: MessageServiceService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':conversationId/messages')
  sendMessage(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendMessageDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    return this.messageServiceService.sendMessage(
      conversationId,
      dto,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':conversationId/messages')
  listMessages(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponse[]> {
    return this.messageServiceService.listMessages(
      conversationId,
      req.user.userId,
    );
  }
}
