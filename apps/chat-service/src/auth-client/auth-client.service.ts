import { AuthResponse } from '@app/contracts';
import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs';
import { OperatorFunction } from 'rxjs';

@Injectable()
export class AuthClientService {
  private readonly logger = new Logger(AuthClientService.name);

  constructor(
    @Inject('AUTHORIZER_API_URL') private readonly authServiceUrl: string,
    private readonly httpService: HttpService,
  ) {}

  async verifyUsers(userIds: string[]): Promise<AuthResponse['user'][]> {
    const response = await firstValueFrom(
      this.httpService
        .post(`${this.authServiceUrl}/auth/users/verify`, {
          userIds,
        })
        .pipe(this.handleError('Error during verify users request')),
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
