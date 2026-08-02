export interface AuthResponse {
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
  };
  accessToken: string;
}
