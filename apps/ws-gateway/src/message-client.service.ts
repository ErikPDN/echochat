import { MessageResponse, SendMessageDto } from '@app/contracts';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MessageClientService {
  constructor(
    @Inject('MESSAGE_CLIENT') private readonly messageServiceUrl: string,
    private readonly httpService: HttpService,
  ) {}

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    token: string,
  ): Promise<MessageResponse> {
    const { data } = await firstValueFrom(
      this.httpService.post<MessageResponse>(
        `${this.messageServiceUrl}/conversations/${conversationId}/messages`,
        dto,
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );

    return data;
  }
}
