import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { MessageServiceService } from './message-service.service';
import { MessageResponse, SendMessageDto } from '@app/contracts';
import type { AuthenticatedRequest } from '@app/common';
import { JwtAuthGuard } from '@app/common';

@Controller('messages')
export class MessageServiceController {
  constructor(private readonly messageServiceService: MessageServiceService) {}

  @UseGuards(JwtAuthGuard)
  @Post('send-message')
  sendMessage(
    @Body() dto: SendMessageDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    return this.messageServiceService.sendMessage(dto, req.user.userId);
  }
}
