import { Test, TestingModule } from '@nestjs/testing';
import { MatchService } from './match.service';
import { MatchQueue } from './match.queue';
import { MatchSessionRepository } from './match-session.repository';
import { ModerationService } from '../moderation/moderation.service';
import { MatchStatus, SessionEndReason } from '../../generated/prisma/client';

describe('MatchService', () => {
  let service: MatchService;
  let matchQueue: MatchQueue;
  let matchSessionRepository: jest.Mocked<MatchSessionRepository>;
  let moderationService: jest.Mocked<ModerationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        MatchQueue,
        {
          provide: MatchSessionRepository,
          useValue: {
            findActiveSessionForUser: jest.fn(),
            createMatchedSession: jest.fn(),
            findById: jest.fn(),
            endSession: jest.fn(),
            getUserMatchHistory: jest.fn(),
          },
        },
        {
          provide: ModerationService,
          useValue: {
            getBlockedUserIds: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<MatchService>(MatchService);
    matchQueue = module.get<MatchQueue>(MatchQueue);
    matchSessionRepository = module.get(MatchSessionRepository);
    moderationService = module.get(ModerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should enqueue the first user when no peers are waiting', async () => {
    matchSessionRepository.findActiveSessionForUser.mockResolvedValue(null);

    const result = await service.requestMatch('usr-alice', 'sock-1', 'tech');

    expect(result.status).toBe('queued');
    expect(result.position).toBe(1);
    expect(matchQueue.isQueued('usr-alice')).toBe(true);
  });

  it('should atomically match two users and create a database session', async () => {
    matchSessionRepository.findActiveSessionForUser.mockResolvedValue(null);

    // 1. Alice joins queue
    await service.requestMatch('usr-alice', 'sock-alice', 'coding');

    const mockSession = {
      id: 'session-123',
      conversationId: 'conv-123',
      user1Id: 'usr-alice',
      user2Id: 'usr-bob',
      topic: 'coding',
      status: MatchStatus.ACTIVE,
      startedAt: new Date(),
      endedAt: null,
      endedById: null,
      endReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      conversation: { id: 'conv-123' } as any,
      user1: { id: 'usr-alice', username: 'alice', fullName: 'Alice', avatar: null },
      user2: { id: 'usr-bob', username: 'bob', fullName: 'Bob', avatar: null },
    };

    matchSessionRepository.createMatchedSession.mockResolvedValue(mockSession);

    // 2. Bob joins queue -> Should instantly pair with Alice
    const resultBob = await service.requestMatch('usr-bob', 'sock-bob', 'coding');

    expect(resultBob.status).toBe('matched');
    expect(resultBob.session).toBeDefined();
    expect(resultBob.session?.id).toBe('session-123');
    expect(matchSessionRepository.createMatchedSession).toHaveBeenCalledWith({
      user1Id: 'usr-alice',
      user2Id: 'usr-bob',
      topic: 'coding',
    });
    expect(matchQueue.isQueued('usr-alice')).toBe(false);
    expect(matchQueue.isQueued('usr-bob')).toBe(false);
  });

  it('should skip an active match and notify partner', async () => {
    const mockSession = {
      id: 'session-123',
      conversationId: 'conv-123',
      user1Id: 'usr-alice',
      user2Id: 'usr-bob',
      topic: 'general',
      status: MatchStatus.ACTIVE,
    } as any;

    matchSessionRepository.findById.mockResolvedValue(mockSession);
    matchSessionRepository.endSession.mockResolvedValue({
      ...mockSession,
      status: MatchStatus.ENDED,
      endReason: SessionEndReason.SKIPPED,
    });

    const res = await service.skipMatch('usr-alice', 'session-123');

    expect(res.partnerUserId).toBe('usr-bob');
    expect(matchSessionRepository.endSession).toHaveBeenCalledWith(
      'session-123',
      'usr-alice',
      SessionEndReason.SKIPPED,
    );
  });

  it('should notify stranded partner when a user with an active session queues again', async () => {
    const mockActiveSession = {
      id: 'session-old',
      user1Id: 'usr-alice',
      user2Id: 'usr-bob',
      status: MatchStatus.ACTIVE,
    } as any;

    matchSessionRepository.findActiveSessionForUser.mockResolvedValue(mockActiveSession);
    matchSessionRepository.endSession.mockResolvedValue({
      ...mockActiveSession,
      status: MatchStatus.ENDED,
      endReason: SessionEndReason.SKIPPED,
    });

    const result = await service.requestMatch('usr-alice', 'sock-alice-new', 'movies');

    expect(result.status).toBe('queued');
    expect(result.terminatedSession).toBeDefined();
    expect(result.strandedPartnerId).toBe('usr-bob');
    expect(matchSessionRepository.endSession).toHaveBeenCalledWith(
      'session-old',
      'usr-alice',
      SessionEndReason.SKIPPED,
    );
  });

  it('should handle concurrent skip race without error and return partner correctly', async () => {
    const mockSession = {
      id: 'session-concurrent',
      user1Id: 'usr-alice',
      user2Id: 'usr-bob',
      status: MatchStatus.ACTIVE,
    } as any;

    matchSessionRepository.findById.mockResolvedValue(mockSession);
    matchSessionRepository.endSession.mockResolvedValue({
      ...mockSession,
      status: MatchStatus.ENDED,
      endReason: SessionEndReason.SKIPPED,
    });

    // Both users concurrently issue skip
    const [resAlice, resBob] = await Promise.all([
      service.skipMatch('usr-alice', 'session-concurrent'),
      service.skipMatch('usr-bob', 'session-concurrent'),
    ]);

    expect(resAlice.partnerUserId).toBe('usr-bob');
    expect(resBob.partnerUserId).toBe('usr-alice');
  });

  it('should preserve active session if user disconnects one tab but has other sockets active (VULN-02)', async () => {
    const mockActiveSession = {
      id: 'session-multi-tab',
      user1Id: 'usr-alice',
      user2Id: 'usr-bob',
      status: MatchStatus.ACTIVE,
    } as any;

    matchSessionRepository.findActiveSessionForUser.mockResolvedValue(mockActiveSession);

    // User Alice closes Tab 1, but Tab 2 is still connected (doNotEndActiveSession = true)
    const result = await service.handleUserDisconnect('sock-tab-1', 'usr-alice', true);

    expect(result).toBeNull();
    // Repository.endSession must NOT have been called
    expect(matchSessionRepository.endSession).not.toHaveBeenCalled();
  });

  it('should terminate active session when user disconnects their LAST socket', async () => {
    const mockActiveSession = {
      id: 'session-last-tab',
      user1Id: 'usr-alice',
      user2Id: 'usr-bob',
      status: MatchStatus.ACTIVE,
    } as any;

    matchSessionRepository.findActiveSessionForUser.mockResolvedValue(mockActiveSession);
    matchSessionRepository.endSession.mockResolvedValue({
      ...mockActiveSession,
      status: MatchStatus.ENDED,
      endReason: SessionEndReason.DISCONNECTED,
    });

    // Last socket disconnects (doNotEndActiveSession = false)
    const result = await service.handleUserDisconnect('sock-last', 'usr-alice', false);

    expect(result).toBeDefined();
    expect(result?.endedSession?.id).toBe('session-last-tab');
    expect(result?.partnerUserId).toBe('usr-bob');
    expect(matchSessionRepository.endSession).toHaveBeenCalledWith(
      'session-last-tab',
      'usr-alice',
      SessionEndReason.DISCONNECTED,
    );
  });
});


