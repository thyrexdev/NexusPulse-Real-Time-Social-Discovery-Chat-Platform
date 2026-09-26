import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Normalize double slashes in incoming request paths (e.g. //auth/stranger -> /auth/stranger)
  app.use((req: any, res: any, next: any) => {
    if (req.url && req.url.startsWith('//')) {
      req.url = req.url.replace(/^\/+/, '/');
    }
    next();
  });

  // Security Headers (allow cross-origin requests from frontend)
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // CORS Configuration
  const rawCors = configService.get<string>('CORS_ORIGIN', '*');
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, same-origin, health checks)
      if (!origin || rawCors === '*') {
        return callback(null, true);
      }
      const allowedOrigins = rawCors.split(',').map((o) => o.trim().replace(/\/+$/, ''));
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (
        allowedOrigins.includes(cleanOrigin) ||
        allowedOrigins.includes('*') ||
        cleanOrigin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Real-Time Redis Pub/Sub WebSocket Adapter
  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  const port = Number(process.env.PORT || configService.get('PORT') || 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Real-Time Chat Platform running on http://0.0.0.0:${port}`);
}

bootstrap();
