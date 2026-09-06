import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../user/user.repository';
import { JwtPayload, AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const user = await this.validateSocket(client);

    if (!user) {
      throw new WsException({ code: 'UNAUTHORIZED', message: 'Unauthorized WebSocket connection' });
    }

    // Attach validated user to socket data for downstream event handlers
    client.data.user = user;
    return true;
  }

  async validateSocket(client: Socket): Promise<AuthenticatedUser | null> {
    try {
      const authHeader =
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization ||
        client.handshake?.query?.token;

      if (!authHeader) {
        return null;
      }

      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        'your-super-secret-jwt-key-change-in-production-2026';

      const payload: JwtPayload = this.jwtService.verify(token, { secret });
      const user = await this.userRepository.findById(payload.sub);

      if (!user) {
        return null;
      }

      return {
        userId: user.id,
        email: user.email,
        username: user.username,
      };
    } catch (err: any) {
      this.logger.debug(`Socket authentication failed: ${err.message}`);
      return null;
    }
  }
}
