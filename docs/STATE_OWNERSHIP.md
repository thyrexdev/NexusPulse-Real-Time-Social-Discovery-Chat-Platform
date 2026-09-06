# State Ownership Architecture

This document defines the authoritative owner, storage medium, synchronization mechanism, lifetime, and failure behavior for every state entity in NexusPulse.

---

## State Ownership Matrix

| State Entity | Authoritative Owner | Primary Storage | Secondary / Cache | Lifetime | Synchronization Mechanism | Single vs Multi-Node Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Match Queue Tickets** | Matchmaking Authority | In-Memory (`MatchQueue`) | None | Transient (evicted on match or disconnect) | Synchronous atomic extraction | **Single-Instance Process-Local**: Queue tickets live in one Node process memory. Cross-server matching requires single authority or Redis-backed queue. |
| **User Presence (Socket Maps)** | Gateway Instance | In-Memory (`PresenceService`) | Client room map | Ephemeral (until socket close or heartbeat timeout) | Socket.io events (`user:online`, `user:offline`) | **Per-Node Map**: Tracks local sockets. Cross-node broadcasts fan out via Redis Pub/Sub adapter. |
| **Match Session Lifecycle** | PostgreSQL / Prisma | PostgreSQL (`MatchSession`) | Active session in Gateway memory | Persistent (audit history) | ACID Transaction + WebSocket room broadcast | **Globally Consistent**: PostgreSQL enforces relational state. Both users query DB for active state. |
| **Conversations & Participants** | PostgreSQL / Prisma | PostgreSQL (`Conversation`, `ConversationParticipant`) | Socket room membership | Persistent | Relational joins + Socket.io rooms | **Globally Consistent**: Socket.io Redis adapter syncs room broadcasts across cluster nodes. |
| **Chat Messages** | PostgreSQL / Prisma | PostgreSQL (`Message`) | In-Memory Idempotency Cache (60s TTL) | Persistent | DB write -> Gateway broadcast (`message:created`) | **Globally Consistent**: Messages persist in DB. Idempotency cache dedupes client retries. |
| **User Blocks & Moderation** | Moderation Service | PostgreSQL (`Block`, `Report`) | None (queried at match initiation) | Persistent | DB query on matchmaking ticket evaluation | **Globally Consistent**: Bidirectional block check executed atomically before peer extraction. |
| **Client UI State** | Next.js Frontend | Zustand Store (`useChatStore`) | LocalStorage (Auth token only) | Browser Session | Socket event listeners + REST API reconciliation | **Client-Local**: Reconciled with backend on connect via `ready` and `active` session checks. |

---

## 1. Match Queue State

* **Owner:** `MatchQueue` (`src/match/match.queue.ts`).
* **Storage:** In-memory FIFO array `QueuedUser[]` + O(1) index map `userMap` + socket lookup map `socketToUser`.
* **Invariants Enforced:**
  1. No duplicate user tickets: A user can only occupy one queue slot at any millisecond.
  2. No self-matching: Enforced synchronously during `findAndExtractMatch`.
  3. No blocked pairings: Bidirectional block sets are supplied before extracting candidates.
  4. Immediate synchronous extraction: Matched peers are removed from queue synchronously in the same JavaScript event tick, eliminating race conditions.
* **Limitation:** Since storage is in-process memory, matchmaking is process-bound. In multi-instance deployments without sticky routing or a centralized queue coordinator, peers on separate nodes will not match.

---

## 2. Presence State

* **Owner:** `PresenceService` (`src/realtime/presence.service.ts`).
* **Storage:** In-memory `Map<string, Set<string>>` mapping `userId -> Set<socketId>`.
* **Multi-Device / Multi-Tab Semantics:**
  - A user transitions from **offline to online** only when their active socket count transitions from `0 -> 1`.
  - A user transitions from **online to offline** only when their active socket count transitions from `1 -> 0`.
  - Stale tabs or rapid page refreshes do not flap the user's online indicator if at least one socket remains connected.

---

## 3. Session State

* **Owner:** `MatchSessionRepository` (`src/match/match-session.repository.ts`).
* **Storage:** PostgreSQL table `MatchSession`.
* **Concurrency Guarantee:**
  - All status transitions to `ENDED` are idempotent: if peer A and peer B both execute `match:skip` simultaneously, the repository verifies current state and avoids conflicting updates or unhandled exceptions.

---

## 4. Message Delivery State

* **Owner:** `MessageService` (`src/message/message.service.ts`).
* **Storage:** PostgreSQL table `Message`.
* **Idempotency Guard:** In-memory cache keyed by `${conversationId}:${senderId}:${clientMessageId}` with a 60-second sliding expiration window to deduplicate rapid client retries and socket reconnection replays.
