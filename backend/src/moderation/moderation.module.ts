import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { ModerationRepository } from './moderation.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ModerationController],
  providers: [ModerationService, ModerationRepository],
  exports: [ModerationService, ModerationRepository],
})
export class ModerationModule {}
