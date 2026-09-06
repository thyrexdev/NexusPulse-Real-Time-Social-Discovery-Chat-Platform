import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  // Maps userId -> Set of active socket IDs (multi-device/tab support)
  private readonly userSockets = new Map<string, Set<string>>();

  // Maps socketId -> userId
  private readonly socketToUser = new Map<string, string>();

  // Maps userId -> last seen timestamp
  private readonly lastSeenMap = new Map<string, Date>();

  /**
   * Register a new socket connection for a user.
   * Returns true if this is the user's first active connection (offline -> online transition).
   */
  addConnection(userId: string, socketId: string): boolean {
    let sockets = this.userSockets.get(userId);
    const isFirstConnection = !sockets || sockets.size === 0;

    if (!sockets) {
      sockets = new Set<string>();
      this.userSockets.set(userId, sockets);
    }

    sockets.add(socketId);
    this.socketToUser.set(socketId, userId);
    this.lastSeenMap.delete(userId); // User is active now

    this.logger.debug(
      `Socket ${socketId} connected for user ${userId}. Active sockets for user: ${sockets.size}`,
    );

    return isFirstConnection;
  }

  /**
   * Remove a socket connection on disconnect.
   * Returns information on whether the user has become completely offline.
   */
  removeConnection(socketId: string): { userId: string; isOffline: boolean; lastSeen: Date } | null {
    const userId = this.socketToUser.get(socketId);
    if (!userId) {
      return null;
    }

    this.socketToUser.delete(socketId);
    const sockets = this.userSockets.get(userId);

    let isOffline = false;
    const now = new Date();

    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.lastSeenMap.set(userId, now);
        isOffline = true;
      }
    } else {
      isOffline = true;
      this.lastSeenMap.set(userId, now);
    }

    this.logger.debug(
      `Socket ${socketId} disconnected for user ${userId}. Sockets remaining: ${
        sockets ? sockets.size : 0
      }. isOffline: ${isOffline}`,
    );

    return { userId, isOffline, lastSeen: now };
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  getUserSocketIds(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  getLastSeen(userId: string): Date | null {
    if (this.isUserOnline(userId)) {
      return null; // User is online right now
    }
    return this.lastSeenMap.get(userId) || null;
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  getUserForSocket(socketId: string): string | null {
    return this.socketToUser.get(socketId) || null;
  }
}
