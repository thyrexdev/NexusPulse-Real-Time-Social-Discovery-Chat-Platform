import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { PresenceService } from './presence.service';
import { MessageService } from '../message/message.service';
import { ConversationRepository } from '../conversation/conversation.repository';
import { SendMessageDto } from '../message/dto/message.dto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { MatchService } from '../match/match.service';
import { ModerationService } from '../moderation/moderation.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
})
@UseFilters(WsExceptionFilter)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Per-socket event rate-limiter: socketId:action -> timestamps[]
  private readonly rateLimits = new Map<string, number[]>();

  private checkRateLimit(socketId: string, action: string, maxEvents: number, windowMs: number): boolean {
    const key = `${socketId}:${action}`;
    const now = Date.now();
    const timestamps = (this.rateLimits.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= maxEvents) {
      return false; // Rate limit exceeded
    }

    timestamps.push(now);
    this.rateLimits.set(key, timestamps);
    return true;
  }

  constructor(
    private readonly wsJwtGuard: WsJwtGuard,
    private readonly presenceService: PresenceService,
    private readonly messageService: MessageService,
    private readonly conversationRepository: ConversationRepository,
    private readonly matchService: MatchService,
    private readonly moderationService: ModerationService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(socket: Socket) {
    try {
      const user = await this.wsJwtGuard.validateSocket(socket);
      if (!user) {
        this.logger.warn(`Rejecting unauthenticated socket connection: ${socket.id}`);
        socket.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing authentication token',
        });
        socket.disconnect(true);
        return;
      }

      // Store authenticated user in socket state
      socket.data.user = user;

      // Track presence
      const isFirstConnection = this.presenceService.addConnection(user.userId, socket.id);

      // Join individual user room for targeted notifications
      socket.join(`user:${user.userId}`);

      // Notify clients of user's online state if transitioned from offline
      if (isFirstConnection) {
        this.server.emit('user:online', {
          userId: user.userId,
          username: user.username,
          timestamp: new Date().toISOString(),
        });
      }

      // Auto-join authorized conversation rooms
      const conversations = await this.conversationRepository.findUserConversations(user.userId);
      for (const conversation of conversations) {
        socket.join(`conversation:${conversation.id}`);
      }

      // Emit connected confirmation
      socket.emit('ready', {
        userId: user.userId,
        username: user.username,
        onlineUsers: this.presenceService.getOnlineUsers(),
        joinedConversations: conversations.map((c) => c.id),
      });

      this.logger.log(`Socket connected: ${socket.id} for user ${user.username} (${user.userId})`);
    } catch (error: any) {
      this.logger.error(`Error in handleConnection for socket ${socket.id}: ${error.message}`);
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket) {
    const user: AuthenticatedUser | undefined = socket.data?.user;

    // 1. Remove socket connection from presence tracking first to know if user has other active sockets
    const presenceResult = this.presenceService.removeConnection(socket.id);
    const hasRemainingSockets = presenceResult ? !presenceResult.isOffline : false;

    // 2. Clean up matchmaking queue or active session
    try {
      // Only terminate active session if this was the user's LAST connected socket
      const disconnectResult = await this.matchService.handleUserDisconnect(
        socket.id,
        user?.userId,
        hasRemainingSockets, // doNotEndActiveSession if user still has other active tabs/devices
      );
      if (disconnectResult?.endedSession && disconnectResult?.partnerUserId) {
        this.server.to(`user:${disconnectResult.partnerUserId}`).emit('peer:disconnected', {
          sessionId: disconnectResult.endedSession.id,
          reason: 'DISCONNECTED',
          message: 'Your partner disconnected from the session',
        });
      }
    } catch (err: any) {
      this.logger.error(`Error handling match disconnect for socket ${socket.id}: ${err.message}`);
    }

    // 3. Broadcast offline event if user became completely offline
    if (presenceResult && presenceResult.isOffline) {
      this.server.emit('user:offline', {
        userId: presenceResult.userId,
        lastSeen: presenceResult.lastSeen.toISOString(),
      });
      this.logger.log(`User ${presenceResult.userId} went offline`);
    }

    // 4. Clean up rate-limiting map entries for this socket to prevent memory leak (VULN-01)
    const prefix = `${socket.id}:`;
    for (const key of this.rateLimits.keys()) {
      if (key.startsWith(prefix)) {
        this.rateLimits.delete(key);
      }
    }

    this.logger.log(`Socket disconnected: ${socket.id}`);
  }

  // ==========================================
  // Social Discovery & Matchmaking Handlers
  // ==========================================

  @SubscribeMessage('match:join_queue')
  async handleJoinMatchQueue(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload?: { topic?: string },
  ) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user) {
      return { status: 'error', message: 'Unauthorized' };
    }

    // Rate limit: max 5 queue attempts per 10 seconds per socket
    if (!this.checkRateLimit(socket.id, 'match:join_queue', 5, 10_000)) {
      return { status: 'error', code: 'RATE_LIMITED', message: 'Too many matchmaking requests. Slow down.' };
    }

    const topic = payload?.topic?.trim() || 'general';
    const result = await this.matchService.requestMatch(user.userId, socket.id, topic);

    // If an existing active session was terminated to join queue, notify the abandoned partner
    if (result.terminatedSession && result.strandedPartnerId) {
      this.server.to(`user:${result.strandedPartnerId}`).emit('peer:skipped', {
        sessionId: result.terminatedSession.id,
        reason: 'SKIPPED',
        message: 'Your partner left the session to find another match',
      });
    }

    if (result.status === 'matched' && result.session && result.matchedPeer) {
      const convId = result.session.conversationId;
      const sessionId = result.session.id;

      // Ensure both current user and matched peer join the newly created conversation room
      socket.join(`conversation:${convId}`);
      const peerSocketIds = this.presenceService.getUserSocketIds(result.matchedPeer.userId);
      for (const sId of peerSocketIds) {
        this.server.sockets.sockets.get(sId)?.join(`conversation:${convId}`);
      }

      // Notify current user (partner is user1)
      socket.emit('match:found', {
        sessionId,
        conversationId: convId,
        topic: result.session.topic,
        peer: result.session.user1,
        startedAt: result.session.startedAt,
      });

      // Notify matched peer (partner is user2 / current user)
      this.server.to(`user:${result.matchedPeer.userId}`).emit('match:found', {
        sessionId,
        conversationId: convId,
        topic: result.session.topic,
        peer: result.session.user2,
        startedAt: result.session.startedAt,
      });

      return { status: 'matched', sessionId, conversationId: convId };
    }

    return { status: 'queued', position: result.position, topic };
  }

  @SubscribeMessage('match:leave_queue')
  handleLeaveMatchQueue(@ConnectedSocket() socket: Socket) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user) return { status: 'error', message: 'Unauthorized' };

    this.matchService.cancelMatch(user.userId);
    return { status: 'cancelled' };
  }

  @SubscribeMessage('match:skip')
  async handleSkipMatch(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { sessionId: string; autoRequeue?: boolean; topic?: string },
  ) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user) return { status: 'error', message: 'Unauthorized' };

    // Rate limit: max 6 skips per 10 seconds per socket
    if (!this.checkRateLimit(socket.id, 'match:skip', 6, 10_000)) {
      return { status: 'error', code: 'RATE_LIMITED', message: 'Skipping too fast. Please wait a moment.' };
    }

    try {
      const { session, partnerUserId } = await this.matchService.skipMatch(
        user.userId,
        payload.sessionId,
      );

      // Notify partner
      this.server.to(`user:${partnerUserId}`).emit('peer:skipped', {
        sessionId: session.id,
        message: 'Your partner skipped to another chat',
      });

      // If autoRequeue is requested, immediately re-enter user into matchmaking
      if (payload.autoRequeue) {
        const topic = payload.topic || session.topic || 'general';
        const requeueResult = await this.matchService.requestMatch(
          user.userId,
          socket.id,
          topic,
        );

        if (requeueResult.status === 'matched' && requeueResult.session && requeueResult.matchedPeer) {
          const convId = requeueResult.session.conversationId;
          socket.join(`conversation:${convId}`);
          const peerSockets = this.presenceService.getUserSocketIds(requeueResult.matchedPeer.userId);
          for (const sId of peerSockets) {
            this.server.sockets.sockets.get(sId)?.join(`conversation:${convId}`);
          }

          socket.emit('match:found', {
            sessionId: requeueResult.session.id,
            conversationId: convId,
            topic: requeueResult.session.topic,
            peer: requeueResult.session.user1,
            startedAt: requeueResult.session.startedAt,
          });

          this.server.to(`user:${requeueResult.matchedPeer.userId}`).emit('match:found', {
            sessionId: requeueResult.session.id,
            conversationId: convId,
            topic: requeueResult.session.topic,
            peer: requeueResult.session.user2,
            startedAt: requeueResult.session.startedAt,
          });

          return { status: 'matched', sessionId: requeueResult.session.id, conversationId: convId };
        }

        return { status: 'queued', position: requeueResult.position };
      }

      return { status: 'ok', session };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }

  @SubscribeMessage('session:leave')
  async handleLeaveSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user) return { status: 'error', message: 'Unauthorized' };

    try {
      const { session, partnerUserId } = await this.matchService.leaveSession(
        user.userId,
        payload.sessionId,
      );

      this.server.to(`user:${partnerUserId}`).emit('peer:left', {
        sessionId: session.id,
        message: 'Your partner left the conversation',
      });

      return { status: 'ok', session };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }

  @SubscribeMessage('moderation:report')
  async handleModerationReport(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    payload: {
      reportedUserId: string;
      reason: string;
      details?: string;
      conversationId?: string;
      sessionId?: string;
    },
  ) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user) return { status: 'error', message: 'Unauthorized' };

    try {
      const report = await this.moderationService.reportUser(user.userId, {
        reportedUserId: payload.reportedUserId,
        reason: payload.reason,
        details: payload.details,
        conversationId: payload.conversationId,
      });

      if (payload.sessionId) {
        await this.matchService.skipMatch(user.userId, payload.sessionId);
        this.server.to(`user:${payload.reportedUserId}`).emit('peer:ended', {
          sessionId: payload.sessionId,
          reason: 'REPORTED',
          message: 'Chat session was terminated',
        });
      }

      return { status: 'ok', data: report };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }

  @SubscribeMessage('moderation:block')
  async handleModerationBlock(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { targetUserId: string; sessionId?: string },
  ) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user) return { status: 'error', message: 'Unauthorized' };

    try {
      const block = await this.moderationService.blockUser(user.userId, {
        targetUserId: payload.targetUserId,
      });

      if (payload.sessionId) {
        await this.matchService.skipMatch(user.userId, payload.sessionId);
        this.server.to(`user:${payload.targetUserId}`).emit('peer:ended', {
          sessionId: payload.sessionId,
          reason: 'BLOCKED',
          message: 'Chat session was terminated',
        });
      }

      return { status: 'ok', data: block };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    payload: {
      conversationId: string;
      content?: string;
      attachmentUrl?: string;
      type?: any;
      clientMessageId?: string;
    },
  ) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user) {
      return { status: 'error', message: 'Unauthorized' };
    }

    try {
      const dto: SendMessageDto = {
        content: payload.content,
        attachmentUrl: payload.attachmentUrl,
        type: payload.type,
        clientMessageId: payload.clientMessageId,
      };

      const message = await this.messageService.sendMessage(
        payload.conversationId,
        user.userId,
        dto,
      );

      // Broadcast new message to all participants in conversation room
      this.server.to(`conversation:${payload.conversationId}`).emit('message:created', message);

      // Return delivery acknowledgement to sender
      return { status: 'ok', data: message };
    } catch (error: any) {
      this.logger.error(`Error sending message via WebSocket: ${error.message}`);
      return {
        status: 'error',
        message: error.message || 'Failed to send message',
      };
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user || !payload?.conversationId) return;

    // Throttle typing starts to max 3 per 2 seconds per socket
    if (!this.checkRateLimit(socket.id, 'typing:start', 3, 2000)) {
      return;
    }

    // Broadcast ephemeral typing event to conversation room excluding sender
    socket.to(`conversation:${payload.conversationId}`).emit('typing:started', {
      conversationId: payload.conversationId,
      userId: user.userId,
      username: user.username,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user || !payload?.conversationId) return;

    socket.to(`conversation:${payload.conversationId}`).emit('typing:stopped', {
      conversationId: payload.conversationId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user || !payload?.conversationId) {
      return { status: 'error', message: 'Invalid payload' };
    }

    const isParticipant = await this.conversationRepository.isParticipant(
      payload.conversationId,
      user.userId,
    );

    if (!isParticipant) {
      return { status: 'error', message: 'Not authorized to join this conversation room' };
    }

    socket.join(`conversation:${payload.conversationId}`);
    return { status: 'ok', joined: payload.conversationId };
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (payload?.conversationId) {
      socket.leave(`conversation:${payload.conversationId}`);
      return { status: 'ok', left: payload.conversationId };
    }
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: string; messageId: string },
  ) {
    const user: AuthenticatedUser = socket.data.user;
    if (!user || !payload?.conversationId || !payload?.messageId) return;

    try {
      await this.conversationRepository.updateLastReadMessage(
        payload.conversationId,
        user.userId,
        payload.messageId,
      );

      // Broadcast read receipt to room
      this.server.to(`conversation:${payload.conversationId}`).emit('message:read_receipt', {
        conversationId: payload.conversationId,
        userId: user.userId,
        messageId: payload.messageId,
        readAt: new Date().toISOString(),
      });

      return { status: 'ok' };
    } catch (error: any) {
      return { status: 'error', message: error.message };
    }
  }
}
