import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConversationType, ParticipantRole, MessageType } from '../generated/prisma/client';

describe('Chat Platform (E2E Integration)', () => {
  let app: INestApplication;

  // In-memory data store for E2E tests
  const users: any[] = [];
  const conversations: any[] = [];
  const participants: any[] = [];
  const messages: any[] = [];

  const mockPrismaService = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      create: jest.fn().mockImplementation(({ data }) => {
        const newUser = { id: `user-${users.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        users.push(newUser);
        return Promise.resolve(newUser);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(users.find((u) => u.id === where.id) || null);
        if (where.email) return Promise.resolve(users.find((u) => u.email === where.email) || null);
        if (where.username) return Promise.resolve(users.find((u) => u.username === where.username) || null);
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        if (where?.id?.in) {
          return Promise.resolve(users.filter((u) => where.id.in.includes(u.id)));
        }
        return Promise.resolve(users);
      }),
    },
    conversation: {
      create: jest.fn().mockImplementation(({ data, include }) => {
        const newConv = {
          id: `conv-${conversations.length + 1}`,
          type: data.type,
          title: data.title || null,
          avatar: data.avatar || null,
          lastMessageId: null,
          lastMessageAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        conversations.push(newConv);

        if (data.participants?.create) {
          for (const p of data.participants.create) {
            participants.push({
              id: `p-${participants.length + 1}`,
              conversationId: newConv.id,
              userId: p.userId,
              role: p.role,
              joinedAt: new Date(),
              lastReadMessageId: null,
            });
          }
        }

        const populated = {
          ...newConv,
          participants: participants
            .filter((p) => p.conversationId === newConv.id)
            .map((p) => ({ ...p, user: users.find((u) => u.id === p.userId) })),
          messages: [],
        };
        return Promise.resolve(populated);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const conv = conversations.find((c) => c.id === where.id);
        if (!conv) return Promise.resolve(null);
        return Promise.resolve({
          ...conv,
          participants: participants
            .filter((p) => p.conversationId === conv.id)
            .map((p) => ({ ...p, user: users.find((u) => u.id === p.userId) })),
          messages: messages.filter((m) => m.conversationId === conv.id),
        });
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        let result = [...conversations];
        if (where?.participants?.some?.userId) {
          const userConvIds = participants
            .filter((p) => p.userId === where.participants.some.userId)
            .map((p) => p.conversationId);
          result = result.filter((c) => userConvIds.includes(c.id));
        }
        return Promise.resolve(
          result.map((conv) => ({
            ...conv,
            participants: participants
              .filter((p) => p.conversationId === conv.id)
              .map((p) => ({ ...p, user: users.find((u) => u.id === p.userId) })),
            messages: messages.filter((m) => m.conversationId === conv.id),
          })),
        );
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const conv = conversations.find((c) => c.id === where.id);
        if (conv) Object.assign(conv, data);
        return Promise.resolve(conv);
      }),
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
      create: jest.fn().mockImplementation(({ data }) => {
        const newP = { id: `p-${participants.length + 1}`, ...data, joinedAt: new Date(), lastReadMessageId: null };
        participants.push(newP);
        return Promise.resolve(newP);
      }),
      delete: jest.fn().mockImplementation(({ where }) => {
        const idx = participants.findIndex(
          (p) =>
            p.conversationId === where.conversationId_userId.conversationId &&
            p.userId === where.conversationId_userId.userId,
        );
        if (idx !== -1) participants.splice(idx, 1);
        return Promise.resolve({ success: true });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const p = participants.find(
          (item) =>
            item.conversationId === where.conversationId_userId.conversationId &&
            item.userId === where.conversationId_userId.userId,
        );
        if (p) Object.assign(p, data);
        return Promise.resolve(p);
      }),
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
      findMany: jest.fn().mockImplementation(({ where }) => {
        let res = messages.filter((m) => m.conversationId === where.conversationId && m.deletedAt === null);
        return Promise.resolve(res);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const m = messages.find((item) => item.id === where.id);
        return Promise.resolve(m || null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const m = messages.find((item) => item.id === where.id);
        if (m) Object.assign(m, data);
        return Promise.resolve(m);
      }),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(mockPrismaService);
    }),
  };

  let tokenUserA: string;
  let tokenUserB: string;
  let userAId: string;
  let userBId: string;
  let conversationId: string;
  let messageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication Flow', () => {
    it('POST /auth/register - Register User A', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'alice',
          email: 'alice@chat.com',
          fullName: 'Alice Johnson',
          password: 'password123',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.username).toBe('alice');
      tokenUserA = res.body.accessToken;
      userAId = res.body.user.id;
    });

    it('POST /auth/register - Register User B', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'bob',
          email: 'bob@chat.com',
          fullName: 'Bob Smith',
          password: 'password123',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      tokenUserB = res.body.accessToken;
      userBId = res.body.user.id;
    });

    it('POST /auth/login - Login with email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: 'alice@chat.com',
          password: 'password123',
        })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
    });

    it('GET /auth/me - Fetch authenticated user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.id).toBe(userAId);
      expect(res.body.username).toBe('alice');
    });

    it('GET /auth/me - Reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('2. Conversation Flow', () => {
    it('POST /conversations - Create 1-on-1 private conversation between Alice and Bob', async () => {
      const res = await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          type: ConversationType.PRIVATE,
          participantIds: [userBId],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.type).toBe(ConversationType.PRIVATE);
      expect(res.body.participants).toHaveLength(2);
      conversationId = res.body.id;
    });

    it('POST /conversations - Attempting duplicate private chat returns existing conversation (Idempotent)', async () => {
      const res = await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          type: ConversationType.PRIVATE,
          participantIds: [userBId],
        })
        .expect(201);

      expect(res.body.id).toBe(conversationId);
    });

    it('GET /conversations - List user conversations', async () => {
      const res = await request(app.getHttpServer())
        .get('/conversations')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /conversations/:id - Retrieve conversation details for participant', async () => {
      const res = await request(app.getHttpServer())
        .get(`/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(res.body.id).toBe(conversationId);
    });
  });

  describe('3. Message Flow', () => {
    it('POST /conversations/:conversationId/messages - Send message from Alice', async () => {
      const res = await request(app.getHttpServer())
        .post(`/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          content: 'Hello Bob, this is a real-time messaging platform!',
          type: MessageType.TEXT,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.content).toBe('Hello Bob, this is a real-time messaging platform!');
      expect(res.body.sender.username).toBe('alice');
      messageId = res.body.id;
    });

    it('GET /conversations/:conversationId/messages - Retrieve messages in conversation', async () => {
      const res = await request(app.getHttpServer())
        .get(`/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0].id).toBe(messageId);
    });

    it('PATCH /messages/:messageId - Alice edits her message', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          content: 'Hello Bob (edited message)',
        })
        .expect(200);

      expect(res.body.content).toBe('Hello Bob (edited message)');
      expect(res.body.isEdited).toBe(true);
    });

    it('PATCH /messages/:messageId - Bob cannot edit Alice\'s message (Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({
          content: 'Hacked by Bob',
        })
        .expect(403);
    });

    it('DELETE /messages/:messageId - Alice soft-deletes her message', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
