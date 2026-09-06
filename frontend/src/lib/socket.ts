import { io, Socket } from 'socket.io-client';
import { Message, TypingEvent } from '@/types/chat';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

class SocketManager {
  private socket: Socket | null = null;
  private isConnecting = false;

  connect(token: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.isConnecting = true;
    this.socket = io(WS_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (err) => {
      this.isConnecting = false;
      console.warn('WebSocket connection error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  sendMessage(
    data: { conversationId: string; content: string; attachmentUrl?: string; type?: string },
    callback?: (response: { status: 'ok' | 'error'; data?: Message; message?: string }) => void,
  ) {
    if (!this.socket || !this.socket.connected) {
      if (callback) callback({ status: 'error', message: 'Socket is not connected' });
      return;
    }
    this.socket.emit('message:send', data, callback);
  }

  startTyping(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:start', { conversationId });
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:stop', { conversationId });
    }
  }

  markAsRead(conversationId: string, messageId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('message:read', { conversationId, messageId });
    }
  }

  joinMatchQueue(
    topic: string,
    callback?: (response: { status: 'queued' | 'matched' | 'error'; position?: number; sessionId?: string; conversationId?: string; message?: string }) => void,
  ) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('match:join_queue', { topic }, callback);
    } else if (callback) {
      callback({ status: 'error', message: 'Socket disconnected' });
    }
  }

  leaveMatchQueue(callback?: (response: { status: string }) => void) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('match:leave_queue', {}, callback);
    }
  }

  skipMatch(
    sessionId: string,
    autoRequeue: boolean,
    topic?: string,
    callback?: (response: any) => void,
  ) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('match:skip', { sessionId, autoRequeue, topic }, callback);
    }
  }

  leaveMatchSession(sessionId: string, callback?: (response: any) => void) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('session:leave', { sessionId }, callback);
    }
  }

  reportUser(
    payload: { reportedUserId: string; reason: string; details?: string; conversationId?: string; sessionId?: string },
    callback?: (response: any) => void,
  ) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('moderation:report', payload, callback);
    }
  }

  blockUser(
    payload: { targetUserId: string; sessionId?: string },
    callback?: (response: any) => void,
  ) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('moderation:block', payload, callback);
    }
  }
}

export const socketManager = new SocketManager();
