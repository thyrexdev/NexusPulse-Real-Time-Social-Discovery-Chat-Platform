import { Injectable, Logger } from '@nestjs/common';

export interface QueuedUser {
  userId: string;
  socketId: string;
  topic?: string;
  queuedAt: number;
}

@Injectable()
export class MatchQueue {
  private readonly logger = new Logger(MatchQueue.name);

  // Ordered list of queued candidates for FIFO processing
  private queue: QueuedUser[] = [];

  // Index map: userId -> QueuedUser for O(1) membership checks
  private userMap = new Map<string, QueuedUser>();

  // Index map: socketId -> userId for rapid disconnect cleanup
  private socketToUser = new Map<string, string>();

  /**
   * Atomically search for a compatible candidate in the queue and remove them.
   * If a match is found, the candidate is synchronously removed from the queue
   * before any async ticks occur, completely eliminating race conditions and double-matching.
   */
  findAndExtractMatch(
    candidate: QueuedUser,
    blockedUserIds: Set<string>,
  ): QueuedUser | null {
    const targetTopic = candidate.topic && candidate.topic !== 'all' ? candidate.topic : null;

    let matchedIndex = -1;

    // 1. Try to find a peer with the exact same topic first (if specified)
    if (targetTopic) {
      matchedIndex = this.queue.findIndex(
        (u) =>
          u.userId !== candidate.userId &&
          !blockedUserIds.has(u.userId) &&
          u.topic === targetTopic,
      );
    }

    // 2. If no topic match, find the oldest compatible waiting peer (FIFO)
    if (matchedIndex === -1) {
      matchedIndex = this.queue.findIndex(
        (u) => u.userId !== candidate.userId && !blockedUserIds.has(u.userId),
      );
    }

    if (matchedIndex !== -1) {
      const [matchedPeer] = this.queue.splice(matchedIndex, 1);
      this.userMap.delete(matchedPeer.userId);
      this.socketToUser.delete(matchedPeer.socketId);

      this.logger.debug(
        `Atomic match extracted: ${candidate.userId} <-> ${matchedPeer.userId}. Remaining in queue: ${this.queue.length}`,
      );

      return matchedPeer;
    }

    return null;
  }

  /**
   * Add a user to the matchmaking queue.
   * Returns false if user was already in queue (idempotent).
   */
  enqueue(user: QueuedUser): { success: boolean; position: number } {
    if (this.userMap.has(user.userId)) {
      const existing = this.userMap.get(user.userId)!;
      // Update socket ID if changed (e.g. reconnect)
      existing.socketId = user.socketId;
      existing.topic = user.topic;
      this.socketToUser.set(user.socketId, user.userId);
      const pos = this.queue.findIndex((u) => u.userId === user.userId) + 1;
      return { success: false, position: pos };
    }

    this.queue.push(user);
    this.userMap.set(user.userId, user);
    this.socketToUser.set(user.socketId, user.userId);

    this.logger.debug(
      `User ${user.userId} entered matchmaking queue. Queue length: ${this.queue.length}`,
    );

    return { success: true, position: this.queue.length };
  }

  /**
   * Remove a user from the queue by userId.
   */
  remove(userId: string): boolean {
    const user = this.userMap.get(userId);
    if (!user) return false;

    this.userMap.delete(userId);
    this.socketToUser.delete(user.socketId);
    this.queue = this.queue.filter((u) => u.userId !== userId);

    this.logger.debug(
      `User ${userId} removed from queue. Remaining: ${this.queue.length}`,
    );
    return true;
  }

  /**
   * Remove a user by socketId (used on socket disconnect).
   */
  removeBySocketId(socketId: string): QueuedUser | null {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return null;

    const user = this.userMap.get(userId);
    if (user) {
      this.remove(userId);
      return user;
    }
    return null;
  }

  isQueued(userId: string): boolean {
    return this.userMap.has(userId);
  }

  getQueuePosition(userId: string): number {
    const idx = this.queue.findIndex((u) => u.userId === userId);
    return idx === -1 ? -1 : idx + 1;
  }

  getQueueStats() {
    const now = Date.now();
    const waitTimes = this.queue.map((u) => now - u.queuedAt);
    const avgWaitMs =
      waitTimes.length > 0
        ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
        : 0;

    return {
      size: this.queue.length,
      averageWaitMs: avgWaitMs,
    };
  }

  clear() {
    this.queue = [];
    this.userMap.clear;
    this.socketToUser.clear();
  }
}
