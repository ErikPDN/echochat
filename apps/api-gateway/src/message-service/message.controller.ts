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

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @UseGuards(JwtAuthGuard)
  @Post('send-message')
  sendMessage(
    @Body() dto: SendMessageDto,
    @Headers('authorization') token: string,
  ): Promise<MessageResponse> {
    return this.messageService.sendMessage(dto, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':conversationId')
  listMessages(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Headers('authorization') token: string,
  ): Promise<MessageResponse[]> {
    return this.messageService.listMessages(conversationId, token);
  }
}
