import { Controller } from '@nestjs/common';
import { ChatServiceService } from './chat-service.service';
import { GrpcMethod } from '@nestjs/microservices';
import {
  CHAT_GRPC_SERVICE,
  GetConversationsParticipantsRequestDto,
} from '@app/contracts';

@Controller()
export class ChatGrpcController {
  constructor(private readonly chatService: ChatServiceService) {}

  @GrpcMethod(CHAT_GRPC_SERVICE, 'GetConversationsParticipants')
  async getConversationsParticipants(
    request: GetConversationsParticipantsRequestDto,
  ) {
    const data = await this.chatService.getConversationsParticipants(
      request.conversationIds,
    );

    return {
      conversations: data.map((c) => ({
        ...c,
        members: c.members.map((m) => ({
          ...m,
          lastReadAt: m.lastReadAt.toISOString(),
        })),
      })),
    };
  }
}
