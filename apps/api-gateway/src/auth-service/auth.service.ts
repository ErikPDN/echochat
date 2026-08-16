import {
  AuthResponse,
  InternalAuthResponse,
  LoginDto,
  PublicUserResponse,
  SignupDto,
} from '@app/contracts';
import { NestErrorResponse } from '@app/contracts/auth/interfaces/nest-error-response.interface';
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
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('AUTHORIZER_API_URL') private readonly apiUrl: string,
    private readonly httpService: HttpService,
  ) {}

  async signup(dto: SignupDto): Promise<InternalAuthResponse> {
    const response = await firstValueFrom(
      this.httpService
        .post(`${this.apiUrl}/auth/signup`, dto)
        .pipe(this.handleError('Error during signup request')),
    );
    return response.data;
  }

  async login(dto: LoginDto): Promise<InternalAuthResponse> {
    const response = await firstValueFrom(
      this.httpService
        .post(`${this.apiUrl}/auth/login`, dto)
        .pipe(this.handleError('Error during login request')),
    );
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<InternalAuthResponse> {
    const response = await firstValueFrom(
      this.httpService
        .post(`${this.apiUrl}/auth/refresh`, { refreshToken })
        .pipe(this.handleError('Error during refresh token request')),
    );
    return response.data;
  }

  async logout(refreshToken: string): Promise<void> {
    await firstValueFrom(
      this.httpService
        .post(`${this.apiUrl}/auth/logout`, { refreshToken })
        .pipe(this.handleError('Error during logout request')),
    );
  }

  async getProfile(token: string): Promise<AuthResponse['user']> {
    const response = await firstValueFrom(
      this.httpService
        .get(`${this.apiUrl}/auth/me`, {
          headers: {
            Authorization: token,
          },
        })
        .pipe(this.handleError('Error during getProfile request')),
    );
    return response.data;
  }

  async findUserByUsername(
    username: string,
    token: string,
  ): Promise<PublicUserResponse> {
    const response = await firstValueFrom(
      this.httpService
        .get(`${this.apiUrl}/auth/users/username/${username}`, {
          headers: {
            Authorization: token,
          },
        })
        .pipe(this.handleError('Error during findUserByUsername request')),
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
