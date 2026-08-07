import { NestErrorResponse } from '@app/contracts/auth/interfaces/nest-error-response.interface';
import { OperatorFunction } from 'rxjs/internal/types';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError } from 'rxjs/internal/operators/catchError';
import { HttpService } from '@nestjs/axios';
import { ConversationResponse } from '@app/contracts/chat/interfaces/conversation-response.interface';
import { CreateConversationDto } from '@app/contracts/chat/dto/create-conversation.dto';
import { firstValueFrom } from 'rxjs';
import { AddUserToConversationDto } from '@app/contracts';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject('CHAT_SERVICE_API_URL') private readonly apiUrl: string,
    private readonly httpService: HttpService,
  ) {}

  async createConversation(
    dto: CreateConversationDto,
    token: string,
  ): Promise<ConversationResponse> {
    const response = await firstValueFrom(
      this.httpService
        .post(`${this.apiUrl}/conversations`, dto, {
          headers: {
            Authorization: token,
          },
        })
        .pipe(this.handleError('Error during create conversation request')),
    );

    return response.data;
  }

  async getUserConversations(token: string): Promise<ConversationResponse[]> {
    const response = await firstValueFrom(
      this.httpService
        .get(`${this.apiUrl}/conversations`, {
          headers: {
            Authorization: token,
          },
        })
        .pipe(this.handleError('Error during get user conversations request')),
    );

    return response.data;
  }

  async addUserToConversation(
    dto: AddUserToConversationDto,
    conversationId: string,
    token: string,
  ): Promise<ConversationResponse> {
    const response = await firstValueFrom(
      this.httpService
        .post(`${this.apiUrl}/conversations/${conversationId}/members`, dto, {
          headers: {
            Authorization: token,
          },
        })
        .pipe(
          this.handleError('Error during add user to conversation request'),
        ),
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
