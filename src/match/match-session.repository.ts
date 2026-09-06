import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MatchSession,
  MatchStatus,
  SessionEndReason,
  ConversationType,
  ParticipantRole,
  Prisma,
} from '../../generated/prisma/client';

export type MatchSessionWithDetails = Prisma.MatchSessionGetPayload<{
  include: {
    conversation: true;
    user1: {
      select: {
        id: true;
        username: true;
        fullName: true;
        avatar: true;
      };
    };
    user2: {
      select: {
        id: true;
        username: true;
        fullName: true;
        avatar: true;
      };
    };
  };
}>;

const userSelect = {
  id: true,
  username: true,
  fullName: true,
  avatar: true,
};

@Injectable()
export class MatchSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically creates a private conversation and an active match session in a single database transaction.
   */
  async createMatchedSession(data: {
    user1Id: string;
    user2Id: string;
    topic?: string;
  }): Promise<MatchSessionWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      // 0. Defensive invariant check: end any lingering active sessions for either participant
      if (typeof tx.matchSession.updateMany === 'function') {
        await tx.matchSession.updateMany({
          where: {
            OR: [
              { user1Id: data.user1Id },
              { user2Id: data.user1Id },
              { user1Id: data.user2Id },
              { user2Id: data.user2Id },
            ],
            status: { in: [MatchStatus.WAITING, MatchStatus.MATCHED, MatchStatus.CONNECTING, MatchStatus.ACTIVE] },
          },
          data: {
            status: MatchStatus.ENDED,
            endedAt: new Date(),
            endedById: data.user2Id,
            endReason: SessionEndReason.SKIPPED,
          },
        });
      }

      // 1. Create the private conversation container
      const conversation = await tx.conversation.create({
        data: {
          type: ConversationType.PRIVATE,
          title: data.topic ? `Match: ${data.topic}` : 'Random Social Match',
          participants: {
            create: [
              { userId: data.user1Id, role: ParticipantRole.MEMBER },
              { userId: data.user2Id, role: ParticipantRole.MEMBER },
            ],
          },
        },
      });

      // 2. Create the associated MatchSession with ACTIVE status
      const session = await tx.matchSession.create({
        data: {
          conversationId: conversation.id,
          user1Id: data.user1Id,
          user2Id: data.user2Id,
          topic: data.topic || 'general',
          status: MatchStatus.ACTIVE,
          startedAt: new Date(),
        },
        include: {
          conversation: true,
          user1: { select: userSelect },
          user2: { select: userSelect },
        },
      });

      return session;
    });
  }

  async findActiveSessionForUser(userId: string): Promise<MatchSessionWithDetails | null> {
    return this.prisma.matchSession.findFirst({
      where: {
        status: { in: [MatchStatus.WAITING, MatchStatus.MATCHED, MatchStatus.CONNECTING, MatchStatus.ACTIVE] },
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        conversation: true,
        user1: { select: userSelect },
        user2: { select: userSelect },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findById(sessionId: string): Promise<MatchSessionWithDetails | null> {
    return this.prisma.matchSession.findUnique({
      where: { id: sessionId },
      include: {
        conversation: true,
        user1: { select: userSelect },
        user2: { select: userSelect },
      },
    });
  }

  async endSession(
    sessionId: string,
    endedById: string,
    reason: SessionEndReason,
  ): Promise<MatchSessionWithDetails> {
    // 1. Fetch current session state to check if already ended (idempotent race guard)
    const existing = await this.findById(sessionId);
    if (!existing) {
      throw new Error(`Match session ${sessionId} not found`);
    }

    if (existing.status === MatchStatus.ENDED) {
      // Session was already transitioned to ENDED by peer concurrent action; return existing state cleanly
      return existing;
    }

    return this.prisma.matchSession.update({
      where: { id: sessionId },
      data: {
        status: MatchStatus.ENDED,
        endedAt: new Date(),
        endedById,
        endReason: reason,
      },
      include: {
        conversation: true,
        user1: { select: userSelect },
        user2: { select: userSelect },
      },
    });
  }

  async getUserMatchHistory(userId: string, limit = 20) {
    return this.prisma.matchSession.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        conversation: true,
        user1: { select: userSelect },
        user2: { select: userSelect },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
