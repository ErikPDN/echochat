export interface NestErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
