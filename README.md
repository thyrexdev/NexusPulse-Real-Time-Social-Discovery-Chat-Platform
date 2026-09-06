# NexusPulse: Real-Time Social Discovery & Matchmaking Engine

> High-velocity social discovery platform that matches online strangers into ephemeral conversations with synchronous in-memory mutex queues, server-authoritative message delivery, and real-time Socket.io clustering.

[![Quality Gate](https://img.shields.io/badge/Quality_Gate-Passed-emerald?style=flat-square)](docs/TEST_MATRIX.md)
[![Unit Tests](https://img.shields.io/badge/Unit_Tests-53%2F53_Passed-blue?style=flat-square)](docs/TEST_MATRIX.md)
[![E2E Tests](https://img.shields.io/badge/E2E_Tests-21%2F21_Passed-indigo?style=flat-square)](docs/TEST_MATRIX.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Clean-teal?style=flat-square)](docs/FINAL_ENGINEERING_REPORT.md)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](LICENSE)

---

## 🧭 System Overview

NexusPulse bridges strangers in real time based on mutual topic interests or global discovery queues. It is engineered with a strict **Clean Architecture**, enforcing explicit state boundaries between durable relational data (PostgreSQL), ephemeral pub/sub transports (Redis Socket.io adapter), and instantaneous in-memory matchmaking authority.

```
                             ┌─────────────────────────┐
                             │   Next.js 16 Client     │
                             │  (React 19, Zustand 5)  │
                             └────────────┬────────────┘
                                          │
                                WebSocket / HTTP REST
                                          │
                                          ▼
                             ┌─────────────────────────┐
                             │    NestJS 11 Gateway    │
                             │  (ChatGateway + Engine) │
                             └──────┬───────────┬──────┘
                                    │           │
                  ┌─────────────────┘           └─────────────────┐
                  ▼                                               ▼
       ┌─────────────────────┐                         ┌─────────────────────┐
       │     PostgreSQL      │                         │     Redis Node      │
       │  (Prisma ORM v7)    │                         │ (Socket.io Adapter) │
       │ MatchSession, Msg,  │                         │ Cross-Node Rooms    │
       │ User, Conversation  │                         │ Pub/Sub Broadcasts  │
       └─────────────────────┘                         └─────────────────────┘
```

---

## Product Preview

![NexusPulse — Live Real-Time Chat](docs/assets/nexuspulse-live-chat.png)

*Active 3-column real-time conversation workspace with live WebSocket synchronization, network latency telemetry, topic affinity tags, and safety enforcement.*

![NexusPulse — Discovery & Matchmaking](docs/assets/nexuspulse-discovery.png)

> NexusPulse's real-time discovery and conversation experience, powered by Socket.IO with persistent session and message state.

---

## ⚡ Key Engineering Highlights

### 1. Concurrency-Safe In-Tick Match Extraction
- **The Problem:** In high-concurrency environments, asynchronous pauses between checking candidate compatibility and removing them from a queue cause duplicate matching races and self-pairing.
- **The Solution:** `MatchQueue` implements a synchronous, single-event-tick candidate extraction algorithm (`findAndExtractMatch`). Matching candidates are sliced from the in-memory array synchronously before any asynchronous database I/O is scheduled, mathematically eliminating double-matching and ticket ghosting under load.

### 2. Idempotent Session Lifecycle & Skip Race Protection
- **The Problem:** If User A and User B click "Next / Skip" simultaneously, or one disconnects while the other skips, standard database update operations suffer write conflicts or unhandled promise rejections.
- **The Solution:** `MatchSessionRepository.endSession` executes an idempotent conditional check. The first terminal transition commits the end reason (`SKIPPED`, `DISCONNECTED`), while subsequent concurrent requests cleanly return the existing terminal state without throwing errors or corrupting session history.

### 3. In-Flight Request Collapsing for Message Idempotency
- **The Problem:** If a client sends rapid duplicate messages (network retry loops, double-clicks) before the first database insert commits, post-insert caches fail to prevent duplicate row creation.
- **The Solution:** `MessageService` tracks pending execution promises in an `inFlightRequests Map`. Simultaneous identical requests join the active in-flight Promise, resulting in exactly one database insertion. Subsequent retries hit a 60-second sliding-window cache keyed by `(conversationId, senderId, clientMessageId)`.

### 4. Multi-Socket Presence with Tab-Closing Hysteresis
- **The Problem:** In traditional single-socket presence systems, closing one browser tab or switching apps on mobile marks the user offline, disrupting ongoing desktop sessions.
- **The Solution:** `PresenceService` aggregates active connections per user in an indexed `Set<socketId>`. The user transitions to offline only when their final active socket disconnects. Closing secondary tabs preserves the active chat session.

### 5. In-Gateway WebSocket Defense & Memory Reclamation
- **The Problem:** Raw WebSocket frames bypass traditional HTTP guards, and storing per-socket rate limit counters in memory leads to progressive heap exhaustion over high connection turnover.
- **The Solution:** `ChatGateway` enforces a sliding-window token bucket on sensitive events (`match:join_queue`, `match:skip`, `typing:start`) and purges all socket keys upon disconnect (`handleDisconnect`), guaranteeing zero memory leaks.

---

## ⚖️ Architectural Boundaries & Trade-Offs (Honest Reality)

We believe in documenting architectural realities rather than presenting theoretical ideals:

| Subsystem | Current Implementation | Architectural Rationale | Scalability Horizon & Migration |
| :--- | :--- | :--- | :--- |
| **Match Queue** | **Process-Local In-Memory** | Sub-2ms matching latency with zero lock contention on a single authoritative node. | For multi-node matchmaking, migration to Redis Sorted Sets (`ZSET`) with Lua atomic scripts is mapped out in [ADR 004](docs/ADR/004-matchmaking-strategy.md). |
| **WebSocket Transport**| **Redis Pub/Sub Clustered** | Stateful WebSockets scale horizontally across instances using `@socket.io/redis-adapter`. | Automatic fallback to local in-memory adapter if Redis becomes unavailable. |
| **Durable State** | **PostgreSQL (Prisma 7)** | ACID transactions (`$transaction`) guarantee relational integrity across conversations, participants, and sessions. | Keyset cursor pagination anchors message queries deterministically without drift. |
| **Presence State** | **Instance-Local Memory** | Ultra-fast O(1) multi-socket mapping without external network hops. | For cluster-wide presence queries, Redis Sets (`SADD/SREM`) provide the scaling path. |

---

## 🔬 Red-Team Adversarial Verification

NexusPulse underwent an adversarial testing challenge to break concurrency and state invariants. All discovered vulnerabilities were patched and reinforced with regression suites:

* **[VULN-01 Fixed] Gateway Memory Reclamation:** Fixed unbounded `rateLimits` map entries by implementing an automated socket prefix sweeper.
* **[VULN-02 Fixed] Multi-Tab Session Preservation:** Prevented premature session teardown when non-primary sockets disconnect.
* **[VULN-03 Fixed] In-Flight Duplicate Bursting:** Collapsed simultaneous identical sends into a single database write.
* **[VULN-04 Fixed] Transactional Active Session Clean-up:** Enforced lingering session closure inside the session creation transaction.

Full adversarial audit report: **[RED_TEAM_FINAL_REPORT.md](docs/RED_TEAM_FINAL_REPORT.md)**.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router, Server & Client Components)
- **Language:** TypeScript 5
- **Real-Time Client:** Socket.io-client 4
- **State Management:** Zustand 5
- **Styling:** Modular Vanilla CSS & Glassmorphism Design Tokens

### Backend
- **Framework:** NestJS 11
- **Language:** TypeScript 5
- **Real-Time Server:** Socket.io 4 with `@socket.io/redis-adapter`
- **Database ORM:** Prisma 7 with `@prisma/adapter-pg`
- **Database:** PostgreSQL 16
- **Cache & Pub/Sub:** Redis 7 (ioredis)

### Testing & Verification
- **Testing Engine:** Jest 29
- **Unit Suites:** 53 passing tests
- **E2E Suites:** 21 passing tests

---

## 📁 Technical Documentation Directory (`docs/`)

Explore the engineering deep dives, failure matrices, and decision records:

| Document | Description |
| :--- | :--- |
| **[FINAL_ENGINEERING_REPORT.md](docs/FINAL_ENGINEERING_REPORT.md)** | Executive architecture summary, reliability guarantees, and known limits. |
| **[STATE_OWNERSHIP.md](docs/STATE_OWNERSHIP.md)** | Authoritative owner, storage medium, synchronization, and lifetime for every entity. |
| **[SESSION_STATE_MACHINE.md](docs/SESSION_STATE_MACHINE.md)** | Formal lifecycle state machine (`WAITING`, `MATCHED`, `ACTIVE`, `ENDED`) and end reasons. |
| **[MESSAGE_DELIVERY.md](docs/MESSAGE_DELIVERY.md)** | Sequencing, deduplication, server-authoritative timestamps, and cursor pagination. |
| **[FAILURE_SCENARIOS.md](docs/FAILURE_SCENARIOS.md)** | Resilience matrix detailing detection, behavior, and recovery for 12 failure modes. |
| **[TEST_MATRIX.md](docs/TEST_MATRIX.md)** | Complete coverage matrix linking features to unit, integration, and E2E tests. |
| **[OBSERVABILITY.md](docs/OBSERVABILITY.md)** | Structured log catalog, correlation IDs, and data redaction policies. |
| **[API.md](docs/API.md)** | Complete REST API endpoints, DTO contracts, and error code specifications. |
| **[REALTIME_PROTOCOL.md](docs/REALTIME_PROTOCOL.md)** | WebSocket event definitions, packet schemas, and bidirectional flow diagrams. |
| **[ADRs](docs/ADR/)** | Architectural Decision Records (004 Matchmaking, 007 Message Delivery, 008 Presence). |

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 20.x or 22.x
- PostgreSQL 15+ (local or containerized)
- Redis (optional — automatically falls back to in-memory mode if disabled)

### 1. Installation
```bash
git clone https://github.com/your-username/realtime-messaging-platform.git
cd realtime-messaging-platform

# Install dependencies across all workspace packages (backend + frontend)
pnpm install
```

### 2. Environment Configuration
```bash
cp backend/.env.example backend/.env
```
Ensure `DATABASE_URL` matches your local or cloud PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chat_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
REDIS_ENABLED="false" # Set to true if local/cloud Redis instance is active
PORT=3000
```

### 3. Database Migration
```bash
# Generate Prisma Client & push schema to database
pnpm prisma:generate
pnpm prisma:push
pnpm db:seed
```

### 4. Running Development Servers
```bash
# Option A: Run both Backend and Frontend concurrently
pnpm dev

# Option B: Run independently
pnpm dev:backend   # NestJS API & WebSocket Gateway on port 3000
pnpm dev:frontend  # Next.js App on port 3001
```
Open **`http://localhost:3001`** in your browser to launch the discovery radar.

---

## 🧪 Quality Gate Verification

Execute the complete automated test suite locally:

```bash
# Run 53 unit tests (Concurrency, Idempotency, Presence, Queue)
pnpm test:backend

# Run 21 end-to-end integration tests (HTTP REST, WebSocket Rooms)
pnpm test:backend:e2e

# Production builds
pnpm build:backend
pnpm build:frontend
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
