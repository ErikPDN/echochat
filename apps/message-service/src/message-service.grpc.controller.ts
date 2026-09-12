import { MessageServiceController } from '@app/contracts/message/grpc/proto/message';
import { Controller, UseGuards } from '@nestjs/common';
import { MessageServiceService } from './message-service.service';
import {
  GrpcUser,
  MessageGrpc,
  MessageGrpcMapper,
} from '@app/contracts/message';
import { GrpcAuthGuard } from '@app/contracts/message/grpc/grpc-auth.guard';
import { GrpcMethod } from '@nestjs/microservices';
import type { AuthenticatedUser } from '@app/common';

@Controller()
export class MessageServiceGrpcController implements MessageServiceController {
  constructor(private readonly messageService: MessageServiceService) {}

  @UseGuards(GrpcAuthGuard)
  @GrpcMethod(MessageGrpc.MESSAGE_SERVICE_NAME, 'SendMessage')
  async sendMessage(
    request: MessageGrpc.SendMessageRequest,
    @GrpcUser() user?: AuthenticatedUser,
  ): Promise<MessageGrpc.SendMessageResponse> {
    const { userId } = user as AuthenticatedUser;
    const { conversationId } = request;
    const dto = MessageGrpcMapper.toDto(request);
    const message = await this.messageService.sendMessage(
      conversationId,
      dto,
      userId,
    );
    return MessageGrpcMapper.toResponse(message);
  }
}
