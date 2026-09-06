import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    let message = 'Realtime server error';
    let code = 'WS_ERROR';

    if (exception instanceof WsException) {
      const err = exception.getError();
      if (typeof err === 'object' && err !== null) {
        message = (err as any).message || message;
        code = (err as any).code || code;
      } else {
        message = String(err);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`WebSocket Unhandled Exception: ${exception.message}`, exception.stack);
      message = process.env.NODE_ENV === 'production' ? 'Realtime internal error' : exception.message;
    }

    client.emit('error', {
      event: 'error',
      code,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
