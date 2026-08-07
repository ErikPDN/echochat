import { AuthResponse } from './auth-response.interface';

export interface InternalAuthResponse extends AuthResponse {
  refreshToken: string;
}
