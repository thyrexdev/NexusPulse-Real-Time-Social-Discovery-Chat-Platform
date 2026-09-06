import { MatchQueue, QueuedUser } from './match.queue';

describe('MatchQueue', () => {
  let queue: MatchQueue;

  beforeEach(() => {
    queue = new MatchQueue();
  });

  it('should enqueue a user and return their position', () => {
    const user1: QueuedUser = {
      userId: 'usr-1',
      socketId: 'sock-1',
      topic: 'general',
      queuedAt: Date.now(),
    };

    const res = queue.enqueue(user1);
    expect(res.success).toBe(true);
    expect(res.position).toBe(1);
    expect(queue.isQueued('usr-1')).toBe(true);
    expect(queue.getQueuePosition('usr-1')).toBe(1);
  });

  it('should prevent duplicate queue entries for the same user (idempotency)', () => {
    const user1: QueuedUser = {
      userId: 'usr-1',
      socketId: 'sock-1',
      topic: 'general',
      queuedAt: Date.now(),
    };

    queue.enqueue(user1);
    const res2 = queue.enqueue({ ...user1, socketId: 'sock-1-updated' });

    expect(res2.success).toBe(false);
    expect(res2.position).toBe(1);
    expect(queue.getQueueStats().size).toBe(1);
  });

  it('should atomically find and extract a compatible candidate from queue', () => {
    const user1: QueuedUser = {
      userId: 'usr-1',
      socketId: 'sock-1',
      topic: 'tech',
      queuedAt: Date.now() - 5000,
    };
    queue.enqueue(user1);

    const user2: QueuedUser = {
      userId: 'usr-2',
      socketId: 'sock-2',
      topic: 'tech',
      queuedAt: Date.now(),
    };

    const matchedPeer = queue.findAndExtractMatch(user2, new Set());

    expect(matchedPeer).toBeDefined();
    expect(matchedPeer?.userId).toBe('usr-1');
    // Matched peer must be removed synchronously
    expect(queue.isQueued('usr-1')).toBe(false);
    expect(queue.getQueueStats().size).toBe(0);
  });

  it('should NEVER match a user with themselves', () => {
    const user1: QueuedUser = {
      userId: 'usr-1',
      socketId: 'sock-1',
      topic: 'general',
      queuedAt: Date.now(),
    };
    queue.enqueue(user1);

    const matchAttempt = queue.findAndExtractMatch(user1, new Set());
    expect(matchAttempt).toBeNull();
    expect(queue.isQueued('usr-1')).toBe(true);
  });

  it('should NEVER match with a blocked user', () => {
    const user1: QueuedUser = {
      userId: 'usr-1',
      socketId: 'sock-1',
      topic: 'general',
      queuedAt: Date.now(),
    };
    queue.enqueue(user1);

    const user2: QueuedUser = {
      userId: 'usr-2',
      socketId: 'sock-2',
      topic: 'general',
      queuedAt: Date.now(),
    };

    // user1 is in user2's blocked list
    const blockedSet = new Set(['usr-1']);
    const matchAttempt = queue.findAndExtractMatch(user2, blockedSet);

    expect(matchAttempt).toBeNull();
    expect(queue.isQueued('usr-1')).toBe(true);
  });

  it('should evict user when disconnected by socketId', () => {
    queue.enqueue({
      userId: 'usr-1',
      socketId: 'sock-1',
      topic: 'general',
      queuedAt: Date.now(),
    });

    const evicted = queue.removeBySocketId('sock-1');
    expect(evicted).toBeDefined();
    expect(evicted?.userId).toBe('usr-1');
    expect(queue.isQueued('usr-1')).toBe(false);
  });

  it('should handle concurrent join wave [A, B, C, D] without duplicate matches or participant overlap', () => {
    const users = ['usr-A', 'usr-B', 'usr-C', 'usr-D'].map((id, idx) => ({
      userId: id,
      socketId: `sock-${id}`,
      topic: 'gaming',
      queuedAt: Date.now() + idx,
    }));

    const matchedPairs: Array<[string, string]> = [];

    // Simulate 4 concurrent requests arriving
    for (const u of users) {
      const match = queue.findAndExtractMatch(u, new Set());
      if (match) {
        matchedPairs.push([match.userId, u.userId]);
      } else {
        queue.enqueue(u);
      }
    }

    // Exactly 2 unique pairs should be formed (A paired with B, C paired with D)
    expect(matchedPairs.length).toBe(2);
    expect(matchedPairs[0]).toEqual(['usr-A', 'usr-B']);
    expect(matchedPairs[1]).toEqual(['usr-C', 'usr-D']);
    expect(queue.getQueueStats().size).toBe(0);

    // No participant should appear more than once
    const allParticipants = matchedPairs.flat();
    const uniqueParticipants = new Set(allParticipants);
    expect(uniqueParticipants.size).toBe(4);
  });

  it('should prevent matching when target peer is blocked in reverse', () => {
    // usr-A is queued
    queue.enqueue({
      userId: 'usr-A',
      socketId: 'sock-A',
      topic: 'all',
      queuedAt: Date.now(),
    });

    // usr-B arrives with usr-A in its block set
    const match = queue.findAndExtractMatch(
      {
        userId: 'usr-B',
        socketId: 'sock-B',
        topic: 'all',
        queuedAt: Date.now(),
      },
      new Set(['usr-A']),
    );

    expect(match).toBeNull();
    expect(queue.isQueued('usr-A')).toBe(true);
  });

  it('should correctly prioritize exact topic match over generic queue peer', () => {
    // usr-1 queued with topic 'coding'
    queue.enqueue({
      userId: 'usr-1',
      socketId: 'sock-1',
      topic: 'coding',
      queuedAt: Date.now() - 10000,
    });

    // usr-2 queued with topic 'anime'
    queue.enqueue({
      userId: 'usr-2',
      socketId: 'sock-2',
      topic: 'anime',
      queuedAt: Date.now() - 5000,
    });

    // usr-3 arrives seeking 'anime'
    const match = queue.findAndExtractMatch(
      {
        userId: 'usr-3',
        socketId: 'sock-3',
        topic: 'anime',
        queuedAt: Date.now(),
      },
      new Set(),
    );

    // Should extract usr-2 despite usr-1 being older in queue
    expect(match?.userId).toBe('usr-2');
    expect(queue.isQueued('usr-1')).toBe(true);
    expect(queue.isQueued('usr-2')).toBe(false);
  });

  it('should handle odd number of users [A, B, C]: pair A-B and keep C in queue', () => {
    const userA = { userId: 'usr-A', socketId: 'sock-A', topic: 'all', queuedAt: Date.now() };
    const userB = { userId: 'usr-B', socketId: 'sock-B', topic: 'all', queuedAt: Date.now() + 1 };
    const userC = { userId: 'usr-C', socketId: 'sock-C', topic: 'all', queuedAt: Date.now() + 2 };

    // A joins
    expect(queue.findAndExtractMatch(userA, new Set())).toBeNull();
    queue.enqueue(userA);

    // B joins -> pairs with A
    const matchB = queue.findAndExtractMatch(userB, new Set());
    expect(matchB?.userId).toBe('usr-A');

    // C joins -> no peers waiting, stays in queue
    const matchC = queue.findAndExtractMatch(userC, new Set());
    expect(matchC).toBeNull();
    queue.enqueue(userC);

    expect(queue.getQueueStats().size).toBe(1);
    expect(queue.isQueued('usr-C')).toBe(true);
    expect(queue.isQueued('usr-A')).toBe(false);
    expect(queue.isQueued('usr-B')).toBe(false);
  });

  it('should handle 8 concurrent users [A..H] producing exactly 4 unique pairings', () => {
    const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const users = ids.map((id, idx) => ({
      userId: `usr-${id}`,
      socketId: `sock-${id}`,
      topic: 'general',
      queuedAt: Date.now() + idx,
    }));

    const matchedPairs: Array<[string, string]> = [];

    // Simulate concurrent arrival
    for (const u of users) {
      const match = queue.findAndExtractMatch(u, new Set());
      if (match) {
        matchedPairs.push([match.userId, u.userId]);
      } else {
        queue.enqueue(u);
      }
    }

    expect(matchedPairs.length).toBe(4);
    expect(queue.getQueueStats().size).toBe(0);

    const allMatchedIds = matchedPairs.flat();
    const uniqueIds = new Set(allMatchedIds);
    expect(uniqueIds.size).toBe(8);
  });
});


