# REST HTTP API Specification

**Base URL:** `http://localhost:3000` (or configured `PORT`)  
**Content-Type:** `application/json`  
**Authentication:** HTTP Bearer Token (`Authorization: Bearer <JWT>`)

---

## 1. Authentication Endpoints

### `POST /auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "alice",
  "fullName": "Alice Johnson",
  "email": "alice@example.com",
  "password": "securePassword123",
  "avatar": "https://avatar.iran.liara.run/public/1"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "c1f729b8-d2e1-4560-84c1-6bfa43431101",
    "username": "alice",
    "email": "alice@example.com",
    "fullName": "Alice Johnson",
    "avatar": "https://avatar.iran.liara.run/public/1",
    "createdAt": "2026-09-03T05:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400 Bad Request`: Validation failure (e.g. password < 6 characters, invalid email).
- `409 Conflict`: Username or email already in use.

---

### `POST /auth/login`
Authenticate existing user with email or username.

**Request Body:**
```json
{
  "identifier": "alice@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "c1f729b8-d2e1-4560-84c1-6bfa43431101",
    "username": "alice",
    "email": "alice@example.com",
    "fullName": "Alice Johnson",
    "avatar": null,
    "createdAt": "2026-09-03T05:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials.

---

### `GET /auth/me`
Retrieve authenticated user profile.

**Headers:**
`Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "id": "c1f729b8-d2e1-4560-84c1-6bfa43431101",
  "username": "alice",
  "email": "alice@example.com",
  "fullName": "Alice Johnson",
  "avatar": null,
  "createdAt": "2026-09-03T05:00:00.000Z",
  "updatedAt": "2026-09-03T05:00:00.000Z"
}
```

---

## 2. Conversation Endpoints

### `POST /conversations`
Create a 1-on-1 private conversation or a group conversation.

**Request Body (Private 1-on-1):**
```json
{
  "type": "PRIVATE",
  "participantIds": ["d2e1c1f7-4560-84c1-6bfa-434311010002"]
}
```

**Request Body (Group Chat):**
```json
{
  "type": "GROUP",
  "title": "Backend Engineering Team",
  "avatar": "https://example.com/group-avatar.png",
  "participantIds": [
    "d2e1c1f7-4560-84c1-6bfa-434311010002",
    "e3f2d2e1-4560-84c1-6bfa-434311010003"
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "conv-9876-uuid",
  "type": "PRIVATE",
  "title": null,
  "avatar": null,
  "lastMessageId": null,
  "lastMessageAt": null,
  "createdAt": "2026-09-03T05:10:00.000Z",
  "updatedAt": "2026-09-03T05:10:00.000Z",
  "participants": [
    {
      "id": "p-1",
      "conversationId": "conv-9876-uuid",
      "userId": "c1f729b8-d2e1-4560-84c1-6bfa43431101",
      "role": "MEMBER",
      "joinedAt": "2026-09-03T05:10:00.000Z",
      "lastReadMessageId": null,
      "user": {
        "id": "c1f729b8-d2e1-4560-84c1-6bfa43431101",
        "username": "alice",
        "fullName": "Alice Johnson",
        "avatar": null
      }
    },
    {
      "id": "p-2",
      "conversationId": "conv-9876-uuid",
      "userId": "d2e1c1f7-4560-84c1-6bfa-434311010002",
      "role": "MEMBER",
      "joinedAt": "2026-09-03T05:10:00.000Z",
      "lastReadMessageId": null,
      "user": {
        "id": "d2e1c1f7-4560-84c1-6bfa-434311010002",
        "username": "bob",
        "fullName": "Bob Smith",
        "avatar": null
      }
    }
  ],
  "messages": []
}
```

*Note on Idempotency: If a PRIVATE conversation between the two users already exists, the server returns the existing conversation with status 201.*

---

### `GET /conversations`
List all conversations where the authenticated user is a participant, sorted by most recent activity (`lastMessageAt` / `updatedAt` desc).

**Response (200 OK):**
```json
[
  {
    "id": "conv-9876-uuid",
    "type": "PRIVATE",
    "title": null,
    "lastMessageId": "msg-1234",
    "lastMessageAt": "2026-09-03T05:15:00.000Z",
    "participants": [ ... ],
    "messages": [
      {
        "id": "msg-1234",
        "content": "Sounds great, talk soon!",
        "createdAt": "2026-09-03T05:15:00.000Z",
        "sender": {
          "id": "d2e1c1f7-4560-84c1-6bfa-434311010002",
          "username": "bob",
          "fullName": "Bob Smith"
        }
      }
    ]
  }
]
```

---

### `GET /conversations/:id`
Get full details of a single conversation.

**Errors:**
- `403 Forbidden`: Authenticated user is not a participant.
- `404 Not Found`: Conversation does not exist.

---

### `POST /conversations/:id/participants`
Add a user to a group conversation (Owner/Admin only).

**Request Body:**
```json
{
  "userId": "usr_new_user_uuid",
  "role": "MEMBER"
}
```

---

### `DELETE /conversations/:id/participants/:userId`
Remove a user from a group conversation or leave conversation.

---

## 3. Message Endpoints

### `POST /conversations/:conversationId/messages`
Send a new message to a conversation.

**Request Body:**
```json
{
  "content": "Hello everyone!",
  "attachmentUrl": null,
  "type": "TEXT"
}
```

**Response (201 Created):**
```json
{
  "id": "msg_f3a7638c-c4a0-4382-b34e-8367a73f9104",
  "conversationId": "conv-9876-uuid",
  "senderId": "c1f729b8-d2e1-4560-84c1-6bfa43431101",
  "content": "Hello everyone!",
  "attachmentUrl": null,
  "type": "TEXT",
  "isEdited": false,
  "createdAt": "2026-09-03T05:20:00.000Z",
  "editedAt": null,
  "deletedAt": null,
  "sender": {
    "id": "c1f729b8-d2e1-4560-84c1-6bfa43431101",
    "username": "alice",
    "fullName": "Alice Johnson",
    "avatar": null
  }
}
```

---

### `GET /conversations/:conversationId/messages`
Fetch messages for a conversation with cursor-based pagination.

**Query Parameters:**
- `limit` (optional, default: 50, max: 100): Number of messages to return.
- `cursor` (optional): Message ID to paginate backwards from.

**Response (200 OK):**
```json
{
  "messages": [
    {
      "id": "msg_001",
      "content": "First message",
      "createdAt": "2026-09-03T05:00:00.000Z",
      "sender": { "id": "usr_1", "username": "alice" }
    },
    {
      "id": "msg_002",
      "content": "Second message",
      "createdAt": "2026-09-03T05:01:00.000Z",
      "sender": { "id": "usr_2", "username": "bob" }
    }
  ],
  "nextCursor": "msg_001",
  "hasMore": true
}
```

---

### `PATCH /messages/:messageId`
Edit message content (Author only).

**Request Body:**
```json
{
  "content": "Edited message content"
}
```

---

### `DELETE /messages/:messageId`
Soft-delete message (Author or Group Admin).

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```
