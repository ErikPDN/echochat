import { ConversationParticipantResponse } from '@app/contracts/chat/interfaces/conversation-participant-response.interface';
import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, OperatorFunction } from 'rxjs';

@Injectable()
export class ChatClientService {
  private readonly logger = new Logger(ChatClientService.name);

  constructor(
    @Inject('CHAT_SERVICE_API_URL')
    private readonly chatServiceUrl: string,
    private readonly httpService: HttpService,
  ) {}

  async getConversationParticipants(
    conversationId: string,
  ): Promise<ConversationParticipantResponse> {
    const response = await firstValueFrom(
      this.httpService
        .get(
          `${this.chatServiceUrl}/conversations/${conversationId}/participants`,
        )
        .pipe(this.handleError('Error during get conversation by id request')),
    );
    return response.data;
  }

  private handleError<T>(context: String): OperatorFunction<T, T> {
    return catchError((error: AxiosError) => {
      this.logger.error(`${context}: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data ?? 'Internal Server Error',
        error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  }
}
