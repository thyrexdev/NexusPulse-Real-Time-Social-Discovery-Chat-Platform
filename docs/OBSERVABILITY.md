# System Observability & Structured Logging

This document defines the structured logging standards, metric events, and correlation identifiers used in NexusPulse.

---

## 1. Core Event Catalog

Every critical state transition produces a structured log entry containing standardized correlation tags:

| Event Name | Domain | Typical Metadata |
| :--- | :--- | :--- |
| `connection.created` | Gateway | `{ socketId, userId, username, ip }` |
| `connection.closed` | Gateway | `{ socketId, userId, reason, durationMs }` |
| `matchmaking.joined` | Matchmaking | `{ userId, topic, queuePosition }` |
| `matchmaking.matched` | Matchmaking | `{ sessionId, topic, user1Id, user2Id, durationMs }` |
| `session.started` | Lifecycle | `{ sessionId, conversationId, topic, startedAt }` |
| `session.ended` | Lifecycle | `{ sessionId, endedById, endReason, durationSec }` |
| `message.created` | Messaging | `{ messageId, conversationId, senderId, type }` |
| `moderation.reported` | Moderation | `{ reporterId, reportedUserId, reason, sessionId }` |
| `moderation.blocked` | Moderation | `{ blockerId, blockedUserId, sessionId }` |

---

## 2. Privacy & Security Rules

To ensure compliance and protect user confidentiality:
* 🔴 **PASSWORDS:** Never logged in plain text or hash.
* 🔴 **JWT TOKENS:** Never printed to stdout/stderr.
* 🔴 **MESSAGE CONTENT:** Sensitive body text is omitted from server application logs; only metadata (`messageId`, `length`, `type`, `conversationId`) is recorded in production mode.
