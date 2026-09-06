import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PresenceService } from './presence.service';
import { AuthModule } from '../auth/auth.module';
import { ConversationModule } from '../conversation/conversation.module';
import { MessageModule } from '../message/message.module';
import { MatchModule } from '../match/match.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    AuthModule,
    ConversationModule,
    MessageModule,
    MatchModule,
    ModerationModule,
  ],
  providers: [ChatGateway, PresenceService],
  exports: [ChatGateway, PresenceService],
})
export class RealtimeModule {}
