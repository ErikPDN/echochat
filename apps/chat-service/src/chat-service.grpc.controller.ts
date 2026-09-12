import {
  ChatServiceController,
  ChatServiceControllerMethods,
  GetParticipantsRequest,
} from '@app/contracts';
import { Controller } from '@nestjs/common';
import { ChatServiceService } from './chat-service.service';

@Controller()
@ChatServiceControllerMethods()
export class ChatServiceGrpcController implements ChatServiceController {
  constructor(private readonly chatServiceService: ChatServiceService) {}

  async getConversationsParticipants(request: GetParticipantsRequest) {
    const { conversationIds } = request;
    const data =
      await this.chatServiceService.getConversationsParticipants(
        conversationIds,
      );

    return {
      conversations: data.map((conversation) => ({
        ...conversation,
        members: conversation.members.map((member) => ({
          ...member,
          avatarUrl: member.avatarUrl ?? undefined,
          lastReadAt: member.lastReadAt.toISOString(),
        })),
      })),
    };
  }
}
