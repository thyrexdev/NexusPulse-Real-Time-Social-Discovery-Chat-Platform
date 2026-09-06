# Architecture Decision Records (ADR)

This document records the architectural decisions, trade-offs, alternatives considered, and justifications for the **Real-Time Distributed Chat Platform**.

---

## ADR 001: Hybrid Transport Model (REST for CRUD + WebSockets for Real-Time Events)

- **Status:** Accepted
- **Context:** Chat applications require both reliable request-response operations (registration, login, profile updates, history retrieval) and low-latency, bidirectional event streaming (incoming messages, typing indicators, presence).
- **Alternatives Considered:**
  1. *Pure WebSocket:* Everything (including login, pagination, settings) sent over WebSocket frames.
  2. *Pure HTTP with Long Polling:* No WebSockets; clients poll repeatedly.
  3. *Hybrid Model (REST + WebSockets):* Standard HTTP for stateless CRUD; WebSockets for real-time events.
- **Why Hybrid Was Chosen:**
  - Standard REST is optimized for cacheability, predictable status codes (`401`, `403`, `404`), easy rate-limiting, and standard client tooling.
  - WebSockets eliminate the massive HTTP header overhead and latency of polling for live message delivery.
- **Trade-offs:**
  - *Gain:* Clean separation of stateful streaming vs stateless operations.
  - *Sacrifice:* Requires authenticating and managing two separate protocol lifecycles (HTTP JWT Guard and WebSocket Handshake Guard).

---

## ADR 002: PostgreSQL & Prisma ORM v7 vs. NoSQL

- **Status:** Accepted
- **Context:** Choosing the primary data store for users, conversations, participant memberships, and message histories.
- **Alternatives Considered:**
  1. *MongoDB:* Flexible document store.
  2. *Cassandra / ScyllaDB:* High write throughput wide-column store.
  3. *PostgreSQL with Prisma 7:* Relational database with strong foreign key cascading, ACID transactions, and type-safe query generation.
- **Why PostgreSQL + Prisma Was Chosen:**
  - Chat applications have strong relational invariants: a message must belong to a conversation; a participant must link to a valid user.
  - Foreign key cascades (`onDelete: Cascade`) guarantee no orphaned records when conversations are deleted.
  - Composite constraints (`@@unique([conversationId, userId])`) prevent duplicate memberships at the storage layer.
  - Multi-file Prisma 7 schema provides strict TypeScript type safety with driver adapters (`@prisma/adapter-pg`).
- **Trade-offs:**
  - *Gain:* Strict relational integrity, atomic transactions (`$transaction`), and type safety.
  - *Sacrifice:* Horizontal sharding of SQL databases is more complex than Cassandra at multi-billion message scale.

---

## ADR 003: Explicit Repository Pattern Separation

- **Status:** Accepted
- **Context:** Deciding whether Services should call `PrismaService` directly or through dedicated Repositories (`UserRepository`, `ConversationRepository`, `MessageRepository`).
- **Alternatives Considered:**
  1. *Direct Prisma in Controllers:* (Pasted Express style).
  2. *Direct Prisma in Services:* Standard simple NestJS tutorials.
  3. *Dedicated Repositories:* Abstract data access layer behind services.
- **Why Dedicated Repositories Were Chosen:**
  - Decouples domain logic from database schema queries.
  - Allows 100% isolated unit testing of services with in-memory mock repositories (fast tests running in milliseconds without Docker).
  - Centralizes complex queries, projection shapes (`userSelect`), and includes in one maintainable file.
- **Trade-offs:**
  - *Gain:* Testability, maintainability, clean layer boundaries.
  - *Sacrifice:* Slightly more boilerplate files.

---

## ADR 004: Cursor-Based Pagination for Message History

- **Status:** Accepted
- **Context:** Designing message retrieval pagination for chat history.
- **Alternatives Considered:**
  1. *Offset Pagination (`skip: 50, take: 50`):* Traditional page number based pagination.
  2. *Cursor-Based Pagination (`cursor: { id }, take: -limit`):* Key-based pagination using message ID and `createdAt`.
- **Why Cursor Pagination Was Chosen:**
  - Offset pagination performs an $O(N)$ scan in PostgreSQL (e.g. `OFFSET 100000` scans 100,000 rows).
  - Offset pagination suffers from drift: if 5 new messages arrive while a user is scrolling, offset pagination returns duplicate messages on page 2.
  - Cursor pagination uses index `(conversationId, createdAt)` for instant $O(\log N)$ seeks and consistent pagination boundaries.
- **Trade-offs:**
  - *Gain:* Constant-time performance at arbitrary depth, no duplicate/skipped messages during active chats.
  - *Sacrifice:* Cannot jump directly to arbitrary page numbers (e.g. "Go to page 47").

---

## ADR 005: Redis Pub/Sub Adapter for Horizontal WebSocket Scaling

- **Status:** Accepted
- **Context:** Supporting multi-instance deployments where clients connected to Server 1 need to message clients connected to Server 2.
- **Alternatives Considered:**
  1. *Single Process Monolith:* No inter-server communication.
  2. *Database Polling:* Servers poll PostgreSQL for new messages.
  3. *Kafka / RabbitMQ:* Heavy message brokers.
  4. *Redis Pub/Sub (`@socket.io/redis-adapter`):* Lightweight, sub-millisecond in-memory fan-out.
- **Why Redis Pub/Sub Was Chosen:**
  - Provides sub-millisecond event broadcasting across thousands of WebSocket instances.
  - Built-in integration with Socket.io (`@socket.io/redis-adapter`).
  - Graceful fallback: `RedisIoAdapter` automatically falls back to in-memory mode when Redis is disabled/offline in dev.
- **Trade-offs:**
  - *Gain:* Frictionless horizontal scaling of real-time WebSocket nodes.
  - *Sacrifice:* Requires managing a Redis cluster in production.

---

## ADR 006: Multi-Device Presence State Model

- **Status:** Accepted
- **Context:** Managing online/offline status when users open multiple browser tabs or devices.
- **Alternatives Considered:**
  1. *Single Socket Mapping (`userId -> socketId`):* Overwrites previous connection; closing one tab marks user as offline everywhere.
  2. *Set-Based Mapping (`userId -> Set<socketId>`):* Tracks all active connections for each user.
- **Why Set-Based Mapping Was Chosen:**
  - Accurately reflects real-world user behavior.
  - Triggers `user:online` only when first socket connects ($0 \to 1$).
  - Triggers `user:offline` only when last remaining socket disconnects ($1 \to 0$).
- **Trade-offs:**
  - *Gain:* Reliable presence state without presence flicker.
  - *Sacrifice:* Requires Set management and cleanup in memory.

---

## ADR 007: Persist-Before-Broadcast Message Delivery

- **Status:** Accepted
- **Context:** Determining whether a message should be persisted to PostgreSQL before or after broadcasting to WebSocket rooms.
- **Alternatives Considered:**
  1. *Broadcast-Before-Persist:* Emit immediately to sockets for lowest perceived latency, then write to database in background.
  2. *Persist-Before-Broadcast:* Write message to PostgreSQL in an ACID transaction, then broadcast to room and return delivery ack to sender.
- **Why Persist-Before-Broadcast Was Chosen:**
  - If the database write fails (e.g. constraint violation, disk error), Broadcast-Before-Persist results in "phantom messages" that appeared on recipients' screens but vanish upon page refresh.
  - Persist-Before-Broadcast guarantees that if a message is received by peers, it is durably saved in the database.
- **Trade-offs:**
  - *Gain:* Data consistency, zero phantom messages, reliable delivery acknowledgements.
  - *Sacrifice:* Minor latency increase (database write time ~2–5ms before broadcast).

---

## ADR 008: Ephemeral Typing Indicators

- **Status:** Accepted
- **Context:** Handling `typing:start` and `typing:stop` notifications.
- **Alternatives Considered:**
  1. *Persisted in Database:* Write typing state to a table.
  2. *Ephemeral In-Memory Broadcast:* Broadcast directly to room peers with no database writes.
- **Why Ephemeral Broadcast Was Chosen:**
  - Typing events are high-frequency and temporary. Persisting them to PostgreSQL would cause severe write amplification and bottleneck the primary database.
- **Trade-offs:**
  - *Gain:* Zero database overhead, instant client feedback.
  - *Sacrifice:* Offline users do not see typing indicators (which is expected behavior).
