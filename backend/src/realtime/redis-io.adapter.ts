import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(
    app: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const isRedisEnabled = this.configService.get<string>('REDIS_ENABLED') === 'true';

    if (!isRedisEnabled) {
      this.logger.log('Redis is disabled by configuration. Running in single-instance in-memory adapter mode.');
      return;
    }

    try {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      const password = this.configService.get<string>('REDIS_PASSWORD', '');

      const redisOptions: any = {
        host,
        port,
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.warn('Redis connection retry limit reached. Falling back to in-memory adapter.');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      };

      if (password) {
        redisOptions.password = password;
      }

      const pubClient = new Redis(redisOptions);
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        this.logger.warn(`Redis Pub client error: ${err.message}.`);
      });

      subClient.on('error', (err) => {
        this.logger.warn(`Redis Sub client error: ${err.message}.`);
      });

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          pubClient.once('ready', () => resolve());
          pubClient.once('error', (err) => reject(err));
        }),
        new Promise<void>((resolve, reject) => {
          subClient.once('ready', () => resolve());
          subClient.once('error', (err) => reject(err));
        }),
      ]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Connected to Redis Pub/Sub for horizontal WebSocket clustering');
    } catch (error: any) {
      this.logger.warn(
        `Failed to connect to Redis (${error?.message || error}). Falling back to local in-memory adapter.`,
      );
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
      this.logger.log('Attached Redis adapter to Socket.io server');
    }
    return server;
  }
}
