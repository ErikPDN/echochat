import {
  Body,
  Controller,
  Post,
  UseGuards,
  Headers,
  ParseUUIDPipe,
  Get,
  Param,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '@app/common';
import { MessageResponse, SendMessageDto } from '@app/contracts';

@Controller('conversations')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':conversationId/messages')
  sendMessage(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendMessageDto,
    @Headers('authorization') token: string,
  ): Promise<MessageResponse> {
    return this.messageService.sendMessage(conversationId, dto, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':conversationId/messages')
  listMessages(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Headers('authorization') token: string,
  ): Promise<MessageResponse[]> {
    return this.messageService.listMessages(conversationId, token);
  }
}
