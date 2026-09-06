# Message Delivery, Idempotency & Ordering

This document details how messages are accepted, sequenced, persisted, acknowledged, and reconciled in NexusPulse.

---

## 1. Message Lifecycle Overview

```text
[Client A]                     [NestJS Gateway]                 [PostgreSQL]                [Client B]
     │                               │                               │                           │
     │── emit('message:send') ──────>│                               │                           │
     │   {clientMessageId, content}  │── Check Idempotency Cache ────│                           │
     │                               │── Verify Participant Rights ──│                           │
     │                               │── tx.message.create() ───────>│                           │
     │                               │── tx.conversation.update() ──>│                           │
     │<── ack {status: 'ok', data} ──│                               │                           │
     │                               │── emit('message:created') ───────────────────────────────>│
```

---

## 2. Ordering Guarantee

### Source of Ordering
- **PostgreSQL Server Timestamp (`createdAt: now`) & Monotonic Sequential ID (`UUID` + Index):**
  Ordering is **never** derived from client timestamps (`Date.now()` on the browser), which are subject to client clock drift, timezone variations, and manipulation.
- When querying history via `messageRepository.findMessages`, messages are ordered strictly by:
  ```sql
  ORDER BY createdAt ASC, id ASC
  ```
- Clients reconcile new inbound messages by matching `message.id` and sorting chronologically by `createdAt`.

---

## 3. Idempotency & Duplicate Prevention

### Failure Mode: Network Retries & Reconnects
If a client sends a message, but drops connection before receiving the gateway acknowledgement (`ack`), the client's reconnection loop will re-send the payload. Without deduplication, this results in duplicate chat bubbles.

### Implementation
1. The client generates a unique `clientMessageId` (UUIDv4) upon typing/sending.
2. `MessageService` maintains a sliding in-memory idempotency cache:
   ```typescript
   key: `${conversationId}:${senderId}:${clientMessageId}`
   ttl: 60,000 ms (60 seconds)
   ```
3. If an incoming message matches an unexpired cache key:
   - The database insertion is bypassed.
   - The previously generated `MessageWithSender` is returned immediately.
   - The client receives an affirmative acknowledgement without duplicate row creation or duplicate room broadcasts.

---

## 4. Cursor Pagination Stability

- Message pagination (`GET /conversations/:id/messages?limit=50&cursor=msg-uuid`) uses keyset/cursor pagination:
  ```typescript
  take: -(limit + 1),
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  ```
- **Why Cursor Pagination?**
  Offset-based pagination (`SKIP offset LIMIT limit`) suffers from drift when new messages arrive while a user is scrolling older history (messages shift positions, resulting in duplicate or skipped records). Keyset cursor pagination anchors directly to a specific record ID, ensuring deterministic results regardless of concurrent writes.

---

## 5. Acknowledgement & Reconnect Reconciliation

- **Optimistic UI:** Clients display the pending message locally with a "sending" status.
- **Server ACK:** Once PostgreSQL commits the transaction, the gateway invokes the client's socket callback with `{ status: 'ok', data: message }`.
- **Missed Events on Reconnect:**
  If a client's socket drops during an active session, upon reconnection:
  1. The client re-authenticates and receives the `ready` event.
  2. The client fetches the latest messages via `GET /conversations/:activeId/messages?limit=50`.
  3. Any missed broadcasts that occurred during the network interruption are seamlessly reconciled.
