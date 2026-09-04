import { NestErrorResponse } from '@app/contracts/auth/interfaces/nest-error-response.interface';
import { OperatorFunction } from 'rxjs';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConversationResponse } from '@app/contracts/chat/interfaces/conversation-response.interface';
import { firstValueFrom } from 'rxjs';
import {
  AddUserToConversationDto,
  CreatePrivateConversationDto,
  CreateGroupConversationDto,
} from '@app/contracts';
import FormData from 'form-data';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject('CHAT_SERVICE_API_URL') private readonly apiUrl: string,
    private readonly httpService: HttpService,
  ) {}

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

  async createPrivateConversation(
    dto: CreatePrivateConversationDto,
    token: string,
  ): Promise<ConversationResponse> {
    const response = await firstValueFrom(
      this.httpService
        .post(`${this.apiUrl}/conversations/private`, dto, {
          headers: {
            Authorization: token,
          },
        })
        .pipe(
          this.handleError('Error during create private conversation request'),
        ),
    );

    return response.data;
  }

  async createGroupConversation(
    dto: CreateGroupConversationDto,
    token: string,
    file?: Express.Multer.File,
  ): Promise<ConversationResponse> {
    const formData = new FormData();
    formData.append('groupName', dto.groupName);
    dto.memberIds.forEach((memberId) => formData.append('memberIds', memberId));

    if (file) {
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }

    const response = await firstValueFrom(
      this.httpService
        .post(`${this.apiUrl}/conversations/group`, formData, {
          headers: {
            Authorization: token,
            ...formData.getHeaders(),
          },
        })
        .pipe(
          this.handleError('Error during create group conversation request'),
        ),
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

  async markConversationAsRead(
    conversationId: string,
    token: string,
  ): Promise<void> {
    await firstValueFrom(
      this.httpService
        .patch(`${this.apiUrl}/conversations/${conversationId}/read`, null, {
          headers: {
            Authorization: token,
          },
        })
        .pipe(
          this.handleError('Error during mark conversation as read request'),
        ),
    );
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
