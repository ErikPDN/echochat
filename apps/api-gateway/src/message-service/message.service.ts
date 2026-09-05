import {
  ListMessageQueryDto,
  MessageResponse,
  NestErrorResponse,
  SendMessageDto,
} from '@app/contracts';
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
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @Inject('MESSAGE_SERVICE_API_URL')
    private readonly messageServiceUrl: string,
    private readonly httpService: HttpService,
  ) {}

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    token: string,
  ): Promise<MessageResponse> {
    const response = await firstValueFrom(
      this.httpService
        .post<MessageResponse>(
          `${this.messageServiceUrl}/conversations/${conversationId}/messages`,
          dto,
          {
            headers: {
              Authorization: token,
            },
          },
        )
        .pipe(this.handleError('Error during send message request')),
    );

    return response.data;
  }

  async listMessages(
    conversationId: string,
    token: string,
    query: ListMessageQueryDto,
  ): Promise<MessageResponse[]> {
    const response = await firstValueFrom(
      this.httpService
        .get<MessageResponse[]>(
          `${this.messageServiceUrl}/conversations/${conversationId}/messages`,
          {
            headers: {
              Authorization: token,
            },
            params: {
              before: query.before,
              limit: query.limit,
            },
          },
        )
        .pipe(this.handleError('Error during list messages request')),
    );

    return response.data;
  }

  async getSummary(conversationIds: string[], token: string): Promise<any> {
    const response = await firstValueFrom(
      this.httpService
        .get(`${this.messageServiceUrl}/conversations/messages/summary`, {
          headers: {
            Authorization: token,
          },
          params: {
            conversationIds: conversationIds.join(','),
          },
        })
        .pipe(this.handleError('Error during get summary request')),
    );

    return response.data;
  }

  private handleError<T>(context: string): OperatorFunction<T, T> {
    return catchError((error: AxiosError<NestErrorResponse>) => {
      this.logger.error(`${context}: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data ?? 'Internal Server Error',
        error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  }
}
