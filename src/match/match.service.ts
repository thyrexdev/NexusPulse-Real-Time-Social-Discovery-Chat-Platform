import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { MatchQueue, QueuedUser } from './match.queue';
import {
  MatchSessionRepository,
  MatchSessionWithDetails,
} from './match-session.repository';
import { ModerationService } from '../moderation/moderation.service';
import { SessionEndReason } from '../../generated/prisma/client';

export interface MatchResult {
  status: 'queued' | 'matched';
  position?: number;
  session?: MatchSessionWithDetails;
  matchedPeer?: QueuedUser;
  terminatedSession?: MatchSessionWithDetails;
  strandedPartnerId?: string;
}

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    private readonly matchQueue: MatchQueue,
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly moderationService: ModerationService,
  ) {}

  /**
   * Request matching with an online peer.
   * Atomically pairs two users if a compatible candidate is waiting;
   * otherwise places the requesting user into the thread-safe queue.
   */
  async requestMatch(
    userId: string,
    socketId: string,
    topic = 'general',
  ): Promise<MatchResult> {
    // 1. Check if user already has an active session
    let terminatedSession: MatchSessionWithDetails | undefined;
    let strandedPartnerId: string | undefined;

    const existingActive = await this.matchSessionRepository.findActiveSessionForUser(userId);
    if (existingActive) {
      strandedPartnerId =
        existingActive.user1Id === userId ? existingActive.user2Id : existingActive.user1Id;

      terminatedSession = await this.matchSessionRepository.endSession(
        existingActive.id,
        userId,
        SessionEndReason.SKIPPED,
      );
      this.logger.debug(
        `Terminated previous active session ${existingActive.id} for user ${userId} to re-enter matchmaking (notifying partner ${strandedPartnerId})`,
      );
    }

    // 2. Fetch list of users who cannot be paired (blocked/blockers)
    const blockedUserIds = await this.moderationService.getBlockedUserIds(userId);
    const blockedSet = new Set(blockedUserIds);

    const currentUser: QueuedUser = {
      userId,
      socketId,
      topic,
      queuedAt: Date.now(),
    };

    // 3. Atomically find and extract a compatible waiting peer from the queue
    const matchedPeer = this.matchQueue.findAndExtractMatch(currentUser, blockedSet);

    if (matchedPeer) {
      // 4. Pair both users in an ACID database transaction
      const session = await this.matchSessionRepository.createMatchedSession({
        user1Id: matchedPeer.userId,
        user2Id: userId,
        topic: topic || matchedPeer.topic || 'general',
      });

      this.logger.log(
        `🎉 Match established: Session ${session.id} (Topic: ${session.topic}) between ${matchedPeer.userId} & ${userId}`,
      );

      return {
        status: 'matched',
        session,
        matchedPeer,
        terminatedSession,
        strandedPartnerId,
      };
    }

    // 5. No compatible peer found: enqueue user
    const enqueued = this.matchQueue.enqueue(currentUser);

    return {
      status: 'queued',
      position: enqueued.position,
      terminatedSession,
      strandedPartnerId,
    };
  }

  /**
   * Cancel an active queue search.
   */
  cancelMatch(userId: string): boolean {
    return this.matchQueue.remove(userId);
  }

  /**
   * Skip active match ("Next Stranger").
   * Ends current session and returns partner userId to notify them.
   */
  async skipMatch(
    userId: string,
    sessionId: string,
  ): Promise<{ session: MatchSessionWithDetails; partnerUserId: string }> {
    const session = await this.matchSessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Match session not found');
    }

    if (session.user1Id !== userId && session.user2Id !== userId) {
      throw new ForbiddenException('You are not a participant in this match session');
    }

    const partnerUserId = session.user1Id === userId ? session.user2Id : session.user1Id;

    const endedSession = await this.matchSessionRepository.endSession(
      sessionId,
      userId,
      SessionEndReason.SKIPPED,
    );

    this.logger.log(`Session ${sessionId} skipped by user ${userId}`);

    return { session: endedSession, partnerUserId };
  }

  /**
   * Leave match session without immediate re-queuing.
   */
  async leaveSession(
    userId: string,
    sessionId: string,
  ): Promise<{ session: MatchSessionWithDetails; partnerUserId: string }> {
    const session = await this.matchSessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Match session not found');
    }

    if (session.user1Id !== userId && session.user2Id !== userId) {
      throw new ForbiddenException('You are not a participant in this match session');
    }

    const partnerUserId = session.user1Id === userId ? session.user2Id : session.user1Id;

    const endedSession = await this.matchSessionRepository.endSession(
      sessionId,
      userId,
      SessionEndReason.LEFT,
    );

    this.logger.log(`Session ${sessionId} left by user ${userId}`);

    return { session: endedSession, partnerUserId };
  }

  /**
   * Handle user socket disconnect:
   * Evicts from queue and terminates active session if any (unless user still has other active sockets).
   */
  async handleUserDisconnect(
    socketId: string,
    userId?: string,
    doNotEndActiveSession = false,
  ): Promise<{ endedSession?: MatchSessionWithDetails; partnerUserId?: string } | null> {
    // 1. Remove from queue if waiting
    const removedFromQueue = this.matchQueue.removeBySocketId(socketId);
    const resolvedUserId = userId || removedFromQueue?.userId;

    if (!resolvedUserId) return null;

    // If user has other active sockets (multi-device/tab), do not terminate their active chat session
    if (doNotEndActiveSession) {
      this.logger.debug(
        `Socket ${socketId} disconnected for user ${resolvedUserId}, but user has remaining active sockets. Preserving active session.`,
      );
      return null;
    }

    // 2. Check if user had an active session
    const activeSession = await this.matchSessionRepository.findActiveSessionForUser(resolvedUserId);
    if (activeSession) {
      const partnerUserId =
        activeSession.user1Id === resolvedUserId
          ? activeSession.user2Id
          : activeSession.user1Id;

      const endedSession = await this.matchSessionRepository.endSession(
        activeSession.id,
        resolvedUserId,
        SessionEndReason.DISCONNECTED,
      );

      this.logger.log(
        `Active session ${activeSession.id} terminated due to disconnect of user ${resolvedUserId}`,
      );

      return { endedSession, partnerUserId };
    }

    return null;
  }

  async getActiveSession(userId: string) {
    return this.matchSessionRepository.findActiveSessionForUser(userId);
  }

  async getSessionHistory(userId: string, limit = 20) {
    return this.matchSessionRepository.getUserMatchHistory(userId, limit);
  }

  getQueueStats() {
    return this.matchQueue.getQueueStats();
  }
}
