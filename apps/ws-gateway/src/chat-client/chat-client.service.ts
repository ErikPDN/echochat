import {
  CHAT_PACKAGE_NAME,
  CHAT_SERVICE_NAME,
  ChatServiceClient,
} from '@app/contracts';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { ServiceError, status } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatClientService implements OnModuleInit {
  private readonly logger = new Logger(ChatClientService.name);
  private chatService: ChatServiceClient;

  constructor(@Inject(CHAT_PACKAGE_NAME) private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.chatService =
      this.client.getService<ChatServiceClient>(CHAT_SERVICE_NAME);
  }

  async getConversationsParticipants(conversationIds: string[]) {
    try {
      const { conversations } = await firstValueFrom(
        this.chatService.getConversationsParticipants({ conversationIds }),
      );
      return conversations;
    } catch (err) {
      const error = err as ServiceError;
      this.logger.error(
        `Error fetching conversation participants: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.details ?? 'Internal Server Error',
        error.code === status.NOT_FOUND
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async isConversationMember(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const [conversation] = await this.getConversationsParticipants([
      conversationId,
    ]);
    return conversation?.members.some((member) => member.userId === userId);
  }
}
