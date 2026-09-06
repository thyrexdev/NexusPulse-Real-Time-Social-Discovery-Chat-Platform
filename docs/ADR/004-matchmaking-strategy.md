# ADR 004: Matchmaking Queue Architecture & Scaling Strategy

## Context
NexusPulse is a real-time social discovery platform that connects users with random online strangers based on shared topics or global queues. Matchmaking must execute with minimal latency (<50ms), prevent self-matching, prevent duplicate queue entries, respect bidirectional user blocks, and remain resilient against high-concurrency race conditions.

## Decision
1. **Current Implementation (Single-Instance In-Memory Authority):**
   - The primary matchmaking queue is maintained in memory using an indexed FIFO data structure (`MatchQueue` in `src/match/match.queue.ts`).
   - The queue employs synchronous candidate extraction (`findAndExtractMatch`) where candidate matching and removal happen in the exact same JavaScript event loop tick.
   - Database operations (session creation and conversation provisioning) occur only after atomic extraction.
2. **Horizontal Clustering Reality & Limitations:**
   - While `@socket.io/redis-adapter` is utilized to broadcast messages and sync Socket.io rooms across multiple gateway nodes, the **matchmaking queue state currently resides in the memory of the Node.js process**.
   - As a result, matchmaking in a clustered deployment requires an **Authoritative Matchmaking Node** or sticky session routing for queue events.

## Alternatives Considered
- **Distributed Redis Sorted Set (`ZSET` + Lua Script):**
  - *Pros:* Horizontally scalable across multiple backend instances without single-node bottlenecks.
  - *Cons:* Adds network round-trip overhead and complex Redis Lua scripting for bidirectional block list filtering.
  - *Status:* Planned as the Phase 2 evolution when cluster traffic exceeds single-process memory capacity (~50,000 concurrent queue tickets).

## Consequences
- **Positive:** Zero latency lock contention; immune to async race conditions on single-instance deployments; extremely fast pairing (<5ms in memory).
- **Negative:** Documentation must explicitly state that queue tickets are process-local, avoiding misleading claims of fully distributed matchmaking until Redis queue scripting is deployed.
