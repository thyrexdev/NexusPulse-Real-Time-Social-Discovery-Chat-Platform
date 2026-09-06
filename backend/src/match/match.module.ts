import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { MatchQueue } from './match.queue';
import { MatchSessionRepository } from './match-session.repository';
import { ModerationModule } from '../moderation/moderation.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ModerationModule],
  controllers: [MatchController],
  providers: [MatchService, MatchQueue, MatchSessionRepository],
  exports: [MatchService, MatchQueue, MatchSessionRepository],
})
export class MatchModule {}
