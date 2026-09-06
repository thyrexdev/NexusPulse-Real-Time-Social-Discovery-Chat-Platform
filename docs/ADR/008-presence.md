# ADR 008: Multi-Device Real-Time Presence Architecture

## Context
Users frequently open chat platforms in multiple browser tabs or across mobile and desktop devices simultaneously. A simplistic mapping of `userId -> socketId` causes a user to be erroneously marked offline whenever any single tab is closed or reloaded.

## Decision
1. **Multi-Socket Presence Aggregator:**
   - `PresenceService` maintains an indexed set of active socket IDs per user: `Map<string, Set<string>>`.
   - The user transitions to `online` only when the active socket count increases from `0 to 1`.
   - The user transitions to `offline` only when the active socket count drops to `0`.
2. **Tab-Closing Hysteresis:**
   - Closing one tab while another remains open does not trigger a global `user:offline` event broadcast.
   - When the user becomes completely offline, their `lastSeen` timestamp is recorded in UTC.

## Consequences
- Completely eliminates presence flapping caused by page reloads and multiple open tabs.
- Multi-node scaling note: In multi-server deployments, presence aggregation should use Redis Sets (`SADD / SREM`) to span across instances.
