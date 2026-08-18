export interface UserResponse {
  id: string;
  username: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
}
