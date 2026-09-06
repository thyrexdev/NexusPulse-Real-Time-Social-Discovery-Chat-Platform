import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chatdb?schema=public';
const pool = new Pool({ connectionString });

async function main() {
  console.log('🌱 Seeding PostgreSQL database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Demo Users
  const aliceRes = await pool.query(
    `INSERT INTO "User" ("id", "username", "email", "fullName", "passwordHash", "avatar", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT ("username") DO UPDATE SET "fullName" = EXCLUDED."fullName"
     RETURNING "id", "username"`,
    [
      'usr-alice',
      'alice',
      'alice@chat.com',
      'Alice Johnson',
      passwordHash,
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    ],
  );
  const aliceId = aliceRes.rows[0].id;

  const bobRes = await pool.query(
    `INSERT INTO "User" ("id", "username", "email", "fullName", "passwordHash", "avatar", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT ("username") DO UPDATE SET "fullName" = EXCLUDED."fullName"
     RETURNING "id", "username"`,
    [
      'usr-bob',
      'bob',
      'bob@chat.com',
      'Bob Smith',
      passwordHash,
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    ],
  );
  const bobId = bobRes.rows[0].id;

  const charlieRes = await pool.query(
    `INSERT INTO "User" ("id", "username", "email", "fullName", "passwordHash", "avatar", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT ("username") DO UPDATE SET "fullName" = EXCLUDED."fullName"
     RETURNING "id", "username"`,
    [
      'usr-charlie',
      'charlie',
      'charlie@chat.com',
      'Charlie Davis',
      passwordHash,
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    ],
  );
  const charlieId = charlieRes.rows[0].id;

  console.log(`✅ Demo Users ready: alice (${aliceId}), bob (${bobId}), charlie (${charlieId})`);

  // 2. Seed 1-on-1 Conversation (Alice & Bob)
  const existingPrivate = await pool.query(
    `SELECT "id" FROM "Conversation" WHERE "type" = 'PRIVATE' LIMIT 1`,
  );

  let privateConvId = existingPrivate.rows[0]?.id;
  if (!privateConvId) {
    privateConvId = randomUUID();
    await pool.query(
      `INSERT INTO "Conversation" ("id", "type", "createdAt", "updatedAt", "lastMessageAt")
       VALUES ($1, 'PRIVATE', NOW(), NOW(), NOW())`,
      [privateConvId],
    );

    await pool.query(
      `INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId", "role", "joinedAt")
       VALUES ($1, $2, $3, 'MEMBER', NOW()), ($4, $2, $5, 'MEMBER', NOW())`,
      [randomUUID(), privateConvId, aliceId, randomUUID(), bobId],
    );

    const msgId = randomUUID();
    await pool.query(
      `INSERT INTO "Message" ("id", "conversationId", "senderId", "content", "type", "createdAt")
       VALUES ($1, $2, $3, $4, 'TEXT', NOW())`,
      [msgId, privateConvId, bobId, 'Hey Alice! Welcome to our distributed real-time messaging platform! 🚀'],
    );

    await pool.query(
      `UPDATE "Conversation" SET "lastMessageId" = $1, "lastMessageAt" = NOW() WHERE "id" = $2`,
      [msgId, privateConvId],
    );
  }

  // 3. Seed Group Conversation (Engineering Squad)
  const existingGroup = await pool.query(
    `SELECT "id" FROM "Conversation" WHERE "type" = 'GROUP' LIMIT 1`,
  );

  let groupConvId = existingGroup.rows[0]?.id;
  if (!groupConvId) {
    groupConvId = randomUUID();
    await pool.query(
      `INSERT INTO "Conversation" ("id", "type", "title", "avatar", "createdAt", "updatedAt", "lastMessageAt")
       VALUES ($1, 'GROUP', 'Distributed Systems & Real-Time Engineering', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80', NOW(), NOW(), NOW())`,
      [groupConvId],
    );

    await pool.query(
      `INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId", "role", "joinedAt")
       VALUES ($1, $2, $3, 'OWNER', NOW()), ($4, $2, $5, 'ADMIN', NOW()), ($6, $2, $7, 'MEMBER', NOW())`,
      [randomUUID(), groupConvId, aliceId, randomUUID(), bobId, randomUUID(), charlieId],
    );

    const groupMsgId = randomUUID();
    await pool.query(
      `INSERT INTO "Message" ("id", "conversationId", "senderId", "content", "type", "createdAt")
       VALUES ($1, $2, $3, $4, 'TEXT', NOW())`,
      [
        groupMsgId,
        groupConvId,
        charlieId,
        'The WebSocket gateway and Redis pub/sub sync are operating with sub-millisecond latency! ⚡',
      ],
    );

    await pool.query(
      `UPDATE "Conversation" SET "lastMessageId" = $1, "lastMessageAt" = NOW() WHERE "id" = $2`,
      [groupMsgId, groupConvId],
    );
  }

  console.log('✅ PostgreSQL database seeded successfully with demo accounts and conversations!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
