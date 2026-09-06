import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConversationType, ParticipantRole, MatchStatus } from '../generated/prisma/client';

describe('Matchmaking & Social Discovery (E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let port: number;

  jest.setTimeout(30000);

  const users: any[] = [
    {
      id: 'user-alice',
      username: 'alice',
      email: 'alice@chat.com',
      fullName: 'Alice Johnson',
      passwordHash: 'hash',
      avatar: 'https://avatar.iran.liara.run/public/1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'user-bob',
      username: 'bob',
      email: 'bob@chat.com',
      fullName: 'Bob Smith',
      passwordHash: 'hash',
      avatar: 'https://avatar.iran.liara.run/public/2',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const conversations: any[] = [];
  const matchSessions: any[] = [];

  const mockPrismaService = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(users.find((u) => u.id === where.id) || null);
        if (where.username) return Promise.resolve(users.find((u) => u.username === where.username) || null);
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue(users),
    },
    conversation: {
      create: jest.fn().mockImplementation(({ data }) => {
        const conv = {
          id: `conv-${conversations.length + 1}`,
          type: data.type || ConversationType.PRIVATE,
          title: data.title,
          avatar: null,
          lastMessageId: null,
          lastMessageAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        conversations.push(conv);
        return Promise.resolve(conv);
      }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(conversations.find((c) => c.id === where.id) || null);
      }),
    },
    conversationParticipant: {
      findUnique: jest.fn().mockResolvedValue({ id: 'p-1' }),
    },
    matchSession: {
      create: jest.fn().mockImplementation(({ data }) => {
        const session = {
          id: `sess-${matchSessions.length + 1}`,
          conversationId: data.conversationId,
          user1Id: data.user1Id,
          user2Id: data.user2Id,
          topic: data.topic || 'general',
          status: MatchStatus.ACTIVE,
          startedAt: new Date(),
          endedAt: null,
          endedById: null,
          endReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          conversation: { id: data.conversationId },
          user1: users.find((u) => u.id === data.user1Id),
          user2: users.find((u) => u.id === data.user2Id),
        };
        matchSessions.push(session);
        return Promise.resolve(session);
      }),
      findFirst: jest.fn().mockImplementation(() => Promise.resolve(null)),
      findById: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(matchSessions.find((s) => s.id === where?.id) || null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const s = matchSessions.find((item) => item.id === where.id);
        if (!s) return Promise.resolve(null);
        return Promise.resolve({
          ...s,
          conversation: { id: s.conversationId },
          user1: users.find((u) => u.id === s.user1Id),
          user2: users.find((u) => u.id === s.user2Id),
        });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const s = matchSessions.find((item) => item.id === where.id);
        if (s) {
          Object.assign(s, data);
          return Promise.resolve({
            ...s,
            conversation: { id: s.conversationId },
            user1: users.find((u) => u.id === s.user1Id),
            user2: users.find((u) => u.id === s.user2Id),
          });
        }
        return Promise.resolve(null);
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    block: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    report: {
      create: jest.fn().mockResolvedValue({ id: 'rep-1' }),
    },
    message: {
      create: jest.fn().mockResolvedValue({ id: 'msg-1', content: 'hello' }),
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
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    port = typeof address === 'string' ? 3000 : address.port;

    jwtService = moduleFixture.get<JwtService>(JwtService);

    tokenAlice = jwtService.sign({
      sub: 'user-alice',
      username: 'alice',
      email: 'alice@chat.com',
    });

    tokenBob = jwtService.sign({
      sub: 'user-bob',
      username: 'bob',
      email: 'bob@chat.com',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should pair two concurrent users who join the matchmaking queue and emit match:found to both', (done) => {
    const socketAlice: Socket = io(`http://localhost:${port}`, {
      auth: { token: tokenAlice },
      transports: ['websocket'],
    });

    const socketBob: Socket = io(`http://localhost:${port}`, {
      auth: { token: tokenBob },
      transports: ['websocket'],
    });

    let aliceReady = false;
    let bobReady = false;
    let aliceMatched = false;
    let bobMatched = false;

    const tryMatch = () => {
      if (aliceReady && bobReady) {
        // 1. Alice joins queue
        socketAlice.emit('match:join_queue', { topic: 'coding' }, (ack: any) => {
          expect(ack.status).toBe('queued');

          // 2. Bob joins queue -> triggers immediate match
          socketBob.emit('match:join_queue', { topic: 'coding' }, (ackBob: any) => {
            expect(ackBob.status).toBe('matched');
          });
        });
      }
    };

    socketAlice.on('ready', () => {
      aliceReady = true;
      tryMatch();
    });

    socketBob.on('ready', () => {
      bobReady = true;
      tryMatch();
    });

    socketAlice.on('match:found', (data: any) => {
      expect(data.sessionId).toBeDefined();
      expect(data.conversationId).toBeDefined();
      expect(data.topic).toBe('coding');
      expect(data.peer.username).toBe('bob'); // Alice's peer is Bob
      aliceMatched = true;
      if (aliceMatched && bobMatched) {
        socketAlice.disconnect();
        socketBob.disconnect();
        done();
      }
    });

    socketBob.on('match:found', (data: any) => {
      expect(data.sessionId).toBeDefined();
      expect(data.conversationId).toBeDefined();
      expect(data.peer.username).toBe('alice'); // Bob's peer is Alice
      bobMatched = true;
      if (aliceMatched && bobMatched) {
        socketAlice.disconnect();
        socketBob.disconnect();
        done();
      }
    });
  });

  it('should notify peer when user skips the match', (done) => {
    const socketAlice: Socket = io(`http://localhost:${port}`, {
      auth: { token: tokenAlice },
      transports: ['websocket'],
    });

    const socketBob: Socket = io(`http://localhost:${port}`, {
      auth: { token: tokenBob },
      transports: ['websocket'],
    });

    let aliceReady = false;
    let bobReady = false;

    const startMatch = () => {
      if (aliceReady && bobReady) {
        socketAlice.emit('match:join_queue', { topic: 'music' }, () => {
          socketBob.emit('match:join_queue', { topic: 'music' });
        });
      }
    };

    socketAlice.on('ready', () => {
      aliceReady = true;
      startMatch();
    });

    socketBob.on('ready', () => {
      bobReady = true;
      startMatch();
    });

    socketBob.on('peer:skipped', (data: any) => {
      expect(data.message).toContain('skipped');
      socketAlice.disconnect();
      socketBob.disconnect();
      done();
    });

    socketAlice.on('match:found', (data: any) => {
      // Alice skips the match!
      socketAlice.emit('match:skip', { sessionId: data.sessionId, autoRequeue: false });
    });
  });
});
