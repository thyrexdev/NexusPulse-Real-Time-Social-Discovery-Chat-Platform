export class AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
}

export class JwtPayload {
  sub: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}
