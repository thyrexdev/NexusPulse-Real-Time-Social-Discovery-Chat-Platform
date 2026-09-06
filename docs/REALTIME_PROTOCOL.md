# Real-Time WebSocket Protocol Specification

**Protocol Version:** 1.0.0  
**Transport:** WebSocket (Socket.io Engine.IO v4)  
**Encoding:** JSON  

---

## 1. Connection & Handshake Authentication

Clients must provide a valid JWT Bearer token during the initial connection handshake.

### Handshake Payload (Client $\to$ Server)
Clients can supply the authentication token via any of the following standard options:

1. **Auth Object (Recommended):**
   ```javascript
   const socket = io('http://localhost:3000', {
     auth: {
       token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
     },
     transports: ['websocket']
   });
   ```
2. **Authorization Header:**
   ```javascript
   headers: {
     Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   }
   ```
3. **Query Parameter:**
   `ws://localhost:3000/?token=eyJhbGciOiJIUzI1Ni...`

### Handshake Response (Server $\to$ Client)

#### Successful Authentication: `ready`
Upon validation, the server assigns the socket to all authorized conversation rooms and emits:

```json
{
  "event": "ready",
  "data": {
    "userId": "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "username": "alice",
    "onlineUsers": [
      "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "usr_1c2deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e"
    ],
    "joinedConversations": [
      "conv_e90f23b7-720a-42b7-84bc-5b4cf5c63969"
    ]
  }
}
```

#### Authentication Rejection: `error`
If the token is missing, expired, or invalid:

```json
{
  "event": "error",
  "data": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication token"
  }
}
```
*The server terminates the socket connection immediately after emitting.*

---

## 2. Event Contract Directory

### Client $\to$ Server Events

| Event Name | Description | Acknowledgement Callback |
| :--- | :--- | :--- |
| `message:send` | Send a message to a conversation | Yes (`{ status, data, message }`) |
| `typing:start` | Notify room members that user is typing | No |
| `typing:stop` | Notify room members that user stopped typing | No |
| `conversation:join` | Join a conversation room (e.g. newly created) | Yes (`{ status, joined }`) |
| `conversation:leave`| Leave a conversation room | Yes (`{ status, left }`) |
| `message:read` | Mark message as read (read receipt) | Yes (`{ status }`) |

---

### Server $\to$ Client Events

| Event Name | Description | Broadcast Scope |
| :--- | :--- | :--- |
| `ready` | Connection & sync confirmation | Connecting socket only |
| `message:created` | New message created | Conversation Room (`conversation:<id>`) |
| `message:updated` | Message edited | Conversation Room (`conversation:<id>`) |
| `message:deleted` | Message deleted (soft delete) | Conversation Room (`conversation:<id>`) |
| `message:read_receipt` | User read a message | Conversation Room (`conversation:<id>`) |
| `typing:started` | Participant started typing | Room peers (excluding sender) |
| `typing:stopped` | Participant stopped typing | Room peers (excluding sender) |
| `user:online` | User came online | Global / Connected clients |
| `user:offline` | User went offline (all sockets closed) | Global / Connected clients |
| `error` | Error envelope | Specific client socket |

---

## 3. Payload Schemas

### 1. `message:send` (Client $\to$ Server)
```json
{
  "conversationId": "conv_e90f23b7-720a-42b7-84bc-5b4cf5c63969",
  "content": "Hey there! How is the distributed system working?",
  "attachmentUrl": null,
  "type": "TEXT"
}
```

**Acknowledgement Response:**
```json
{
  "status": "ok",
  "data": {
    "id": "msg_f3a7638c-c4a0-4382-b34e-8367a73f9104",
    "conversationId": "conv_e90f23b7-720a-42b7-84bc-5b4cf5c63969",
    "senderId": "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "content": "Hey there! How is the distributed system working?",
    "attachmentUrl": null,
    "type": "TEXT",
    "isEdited": false,
    "createdAt": "2026-09-03T05:20:00.000Z",
    "editedAt": null,
    "deletedAt": null,
    "sender": {
      "id": "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "username": "alice",
      "fullName": "Alice Johnson",
      "avatar": null
    }
  }
}
```

---

### 2. `typing:start` & `typing:stop`
```json
// Client -> Server
{
  "conversationId": "conv_e90f23b7-720a-42b7-84bc-5b4cf5c63969"
}

// Server -> Room Peers (typing:started)
{
  "conversationId": "conv_e90f23b7-720a-42b7-84bc-5b4cf5c63969",
  "userId": "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "username": "alice",
  "timestamp": "2026-09-03T05:20:05.120Z"
}

// Server -> Room Peers (typing:stopped)
{
  "conversationId": "conv_e90f23b7-720a-42b7-84bc-5b4cf5c63969",
  "userId": "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "timestamp": "2026-09-03T05:20:08.500Z"
}
```

---

### 3. `message:read` (Read Receipts)
```json
// Client -> Server
{
  "conversationId": "conv_e90f23b7-720a-42b7-84bc-5b4cf5c63969",
  "messageId": "msg_f3a7638c-c4a0-4382-b34e-8367a73f9104"
}

// Server -> Room (message:read_receipt)
{
  "conversationId": "conv_e90f23b7-720a-42b7-84bc-5b4cf5c63969",
  "userId": "usr_1c2deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e",
  "messageId": "msg_f3a7638c-c4a0-4382-b34e-8367a73f9104",
  "readAt": "2026-09-03T05:20:12.300Z"
}
```

---

## 4. Matchmaking & Moderation Protocol

### Client $\to$ Server Events

| Event Name | Description | Acknowledgement Callback |
| :--- | :--- | :--- |
| `match:join_queue` | Enter atomic matchmaking queue | Yes (`{ status: 'queued', position, topic }`) |
| `match:leave_queue` | Leave queue before being matched | Yes (`{ status: 'left' }`) |
| `match:skip` | Skip current chat partner and optionally requeue | Yes (`{ status: 'skipped' | 'queued', position? }`) |
| `session:leave` | Terminate current match session | Yes (`{ status: 'left' }`) |
| `moderation:report` | File abuse report against user | Yes (`{ success: boolean, reportId: string }`) |
| `moderation:block` | Block user permanently | Yes (`{ success: boolean, blockId: string }`) |

### Server $\to$ Client Events

| Event Name | Description | Broadcast Scope |
| :--- | :--- | :--- |
| `match:found` | Match successfully paired | Both paired sockets |
| `peer:skipped` | Partner skipped to another stranger | Remaining partner socket |
| `peer:left` | Partner exited conversation | Remaining partner socket |
| `peer:disconnected` | Partner disconnected (socket drop) | Remaining partner socket |
| `peer:ended` | Session ended by system or moderation | Remaining partner socket |

---

### Match Lifecycle Event Payloads

#### 1. `match:found` (Server $\to$ Client)
```json
{
  "sessionId": "clz1234567890",
  "conversationId": "clz0987654321",
  "topic": "tech",
  "startedAt": "2026-09-06T14:30:00.000Z",
  "peer": {
    "id": "usr_bob123",
    "username": "bob",
    "fullName": "Bob Engineer",
    "avatar": "https://images.unsplash.com/..."
  }
}
```

#### 2. `match:skip` (Client $\to$ Server)
```json
{
  "sessionId": "clz1234567890",
  "autoRequeue": true,
  "topic": "tech"
}
```

#### 3. `moderation:report` (Client $\to$ Server)
```json
{
  "reportedUserId": "usr_bob123",
  "reason": "HARASSMENT",
  "details": "Abusive chat conduct",
  "conversationId": "clz0987654321",
  "sessionId": "clz1234567890"
}
```

---

## 5. Reconnection & Recovery Behavior

When a client loses network connection:
1. Socket.io client automatically initiates exponential backoff reconnect attempts.
2. Upon reconnection, client sends fresh auth token in the handshake.
3. Server executes `handleConnection`:
   - Validates JWT.
   - Re-registers socket ID into `PresenceService`.
   - Re-joins user to all current conversation rooms.
   - Emits `ready` event.
4. If a match session was active when a user loses all sockets, `MatchService.handleUserDisconnect` automatically transitions the session to `DISCONNECTED` and alerts the remaining peer via `peer:disconnected`.
5. Client reconciles missed messages using REST API cursor pagination (`GET /conversations/:id/messages?cursor=<last_received_msg_id>`).

