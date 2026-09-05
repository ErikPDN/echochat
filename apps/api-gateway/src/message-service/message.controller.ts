import {
  Body,
  Controller,
  Post,
  UseGuards,
  Headers,
  ParseUUIDPipe,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '@app/common';
import {
  ConversationSummaryResponse,
  GetSummaryQueryDto,
  ListMessageQueryDto,
  MessageResponse,
  SendMessageDto,
} from '@app/contracts';

@Controller('conversations')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @UseGuards(JwtAuthGuard)
  @Get('/messages/summary')
  getSummary(
    @Headers('authorization') token: string,
    @Query() query: GetSummaryQueryDto,
  ): Promise<ConversationSummaryResponse[]> {
    return this.messageService.getSummary(query.conversationIds, token);
  }

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
    @Query() query: ListMessageQueryDto,
    @Headers('authorization') token: string,
  ): Promise<MessageResponse[]> {
    return this.messageService.listMessages(conversationId, token, query);
  }
}
