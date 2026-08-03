export interface AuthenticatedUser {
  userId: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
