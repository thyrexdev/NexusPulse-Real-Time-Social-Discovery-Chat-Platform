import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConversationType, ParticipantRole, MessageType } from '../generated/prisma/client';

describe('Real-Time WebSocket Gateway (E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let port: number;

  jest.setTimeout(30000);

  const users: any[] = [
    { id: 'user-1', username: 'alice', email: 'alice@chat.com', fullName: 'Alice Johnson', passwordHash: 'hash', avatar: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user-2', username: 'bob', email: 'bob@chat.com', fullName: 'Bob Smith', passwordHash: 'hash', avatar: null, createdAt: new Date(), updatedAt: new Date() },
  ];

  const conversations: any[] = [
    { id: 'conv-1', type: ConversationType.PRIVATE, title: null, avatar: null, lastMessageId: null, lastMessageAt: null, createdAt: new Date(), updatedAt: new Date() },
  ];

  const participants: any[] = [
    { id: 'p-1', conversationId: 'conv-1', userId: 'user-1', role: ParticipantRole.MEMBER, joinedAt: new Date(), lastReadMessageId: null, user: users[0] },
    { id: 'p-2', conversationId: 'conv-1', userId: 'user-2', role: ParticipantRole.MEMBER, joinedAt: new Date(), lastReadMessageId: null, user: users[1] },
  ];

  const messages: any[] = [];

  const mockPrismaService = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(users.find((u) => u.id === where.id) || null);
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue(users),
    },
    conversation: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const c = conversations.find((item) => item.id === where.id);
        if (!c) return Promise.resolve(null);
        return Promise.resolve({
          ...c,
          participants: participants.filter((p) => p.conversationId === c.id),
          messages: messages.filter((m) => m.conversationId === c.id),
        });
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        if (where?.participants?.some?.userId) {
          const userConvIds = participants
            .filter((p) => p.userId === where.participants.some.userId)
            .map((p) => p.conversationId);
          return Promise.resolve(
            conversations
              .filter((c) => userConvIds.includes(c.id))
              .map((c) => ({
                ...c,
                participants: participants.filter((p) => p.conversationId === c.id),
                messages: [],
              })),
          );
        }
        return Promise.resolve(conversations);
      }),
      update: jest.fn().mockResolvedValue(conversations[0]),
    },
    conversationParticipant: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.conversationId_userId) {
          const p = participants.find(
            (item) =>
              item.conversationId === where.conversationId_userId.conversationId &&
              item.userId === where.conversationId_userId.userId,
          );
          return Promise.resolve(p || null);
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockResolvedValue(participants[0]),
    },
    message: {
      create: jest.fn().mockImplementation(({ data }) => {
        const newMsg = {
          id: `msg-${messages.length + 1}`,
          ...data,
          isEdited: false,
          editedAt: null,
          deletedAt: null,
          sender: users.find((u) => u.id === data.senderId),
        };
        messages.push(newMsg);
        return Promise.resolve(newMsg);
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    matchSession: {
      findFirst: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(null),
    },
    block: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(mockPrismaService);
    }),
  };

  let tokenAlice: string;
  let tokenBob: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    jwtService = moduleFixture.get<JwtService>(JwtService);
    tokenAlice = jwtService.sign({ sub: 'user-1', username: 'alice', email: 'alice@chat.com' });
    tokenBob = jwtService.sign({ sub: 'user-2', username: 'bob', email: 'bob@chat.com' });

    await app.listen(0);
    const server = app.getHttpServer();
    port = server.address().port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should authenticate client and receive ready event', (done) => {
    const socket: Socket = io(`http://localhost:${port}`, {
      auth: { token: tokenAlice },
      transports: ['websocket'],
    });

    socket.on('ready', (data) => {
      expect(data.userId).toBe('user-1');
      expect(data.username).toBe('alice');
      expect(Array.isArray(data.onlineUsers)).toBe(true);
      expect(data.joinedConversations).toContain('conv-1');
      socket.disconnect();
      done();
    });
  });

  it('should reject unauthenticated socket connection', (done) => {
    const socket: Socket = io(`http://localhost:${port}`, {
      auth: { token: 'invalid-token' },
      transports: ['websocket'],
    });

    socket.on('error', (err) => {
      expect(err.code).toBe('UNAUTHORIZED');
      socket.disconnect();
      done();
    });
  });

  it('should send real-time message and receive acknowledgement', (done) => {
    const socketAlice: Socket = io(`http://localhost:${port}`, {
      auth: { token: tokenAlice },
      transports: ['websocket'],
    });

    const socketBob: Socket = io(`http://localhost:${port}`, {
      auth: { token: tokenBob },
      transports: ['websocket'],
    });

    let bobReady = false;
    let aliceReady = false;

    const trySend = () => {
      if (bobReady && aliceReady) {
        socketAlice.emit(
          'message:send',
          {
            conversationId: 'conv-1',
            content: 'Real-time WebSocket Test Message',
            type: MessageType.TEXT,
          },
          (response: any) => {
            expect(response.status).toBe('ok');
            expect(response.data.content).toBe('Real-time WebSocket Test Message');
          },
        );
      }
    };

    socketBob.on('ready', () => {
      bobReady = true;
      trySend();
    });

    socketAlice.on('ready', () => {
      aliceReady = true;
      trySend();
    });

    socketBob.on('message:created', (message) => {
      expect(message.content).toBe('Real-time WebSocket Test Message');
      expect(message.sender.username).toBe('alice');
      socketAlice.disconnect();
      socketBob.disconnect();
      done();
    });
  });

  it('should broadcast ephemeral typing indicators to room members', (done) => {
    const socketAlice: Socket = io(`http://localhost:${port}`, {
      auth: { token: tokenAlice },
      transports: ['websocket'],
    });

    const socketBob: Socket = io(`http://localhost:${port}`, {
      auth: { token: tokenBob },
      transports: ['websocket'],
    });

    let bobReady = false;
    let aliceReady = false;

    const tryTyping = () => {
      if (bobReady && aliceReady) {
        socketAlice.emit('typing:start', { conversationId: 'conv-1' });
      }
    };

    socketBob.on('ready', () => {
      bobReady = true;
      tryTyping();
    });

    socketAlice.on('ready', () => {
      aliceReady = true;
      tryTyping();
    });

    socketBob.on('typing:started', (data) => {
      expect(data.conversationId).toBe('conv-1');
      expect(data.userId).toBe('user-1');
      expect(data.username).toBe('alice');

      socketAlice.disconnect();
      socketBob.disconnect();
      done();
    });
  });
});
