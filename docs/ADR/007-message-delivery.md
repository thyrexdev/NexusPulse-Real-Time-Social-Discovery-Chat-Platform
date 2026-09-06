# ADR 007: Message Delivery, Sequencing & Idempotency

## Context
In a real-time chat platform, client network drops, mobile cell tower handoffs, and UI double-clicks frequently cause duplicate message transmissions or out-of-order rendering.

## Decision
1. **Server-Authoritative Sequencing:**
   - Client-side timestamps are rejected as the source of message truth.
   - All messages receive a server-side timestamp (`createdAt = now()`) generated within the PostgreSQL transaction and are ordered chronologically by `createdAt ASC, id ASC`.
2. **Client-Driven Idempotency Tokens:**
   - Clients provide an optional `clientMessageId` (UUIDv4) with each send request.
   - `MessageService` validates incoming payloads against a 60-second sliding cache (`Map<key, { message, expiresAt }>`).
   - Duplicate transmissions within this window return the existing message acknowledgement immediately without hitting PostgreSQL a second time.
3. **Deterministic Cursor Pagination:**
   - Pagination queries use keyset cursor navigation (`take: -(limit + 1), cursor: { id }`) rather than offset pagination to avoid message skipping or duplication during concurrent chats.

## Alternatives Considered
- **Database Unique Constraint on `(conversationId, clientMessageId)`:**
  - *Pros:* Persistently guaranteed at storage engine level.
  - *Cons:* Adds index bloat for ephemeral transient keys. The in-memory cache provides sufficient protection for the 60s retry window without database overhead.

## Consequences
- Eliminates duplicate messages caused by reconnection storms.
- Ensures identical chronological ordering across all participants in a conversation.
