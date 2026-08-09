import { prisma } from "../../db/prisma.js";
import type { Prisma } from "@prisma/client";
import { logger } from "@rizlax-org/shared";

type FullMessageById = Prisma.MessageGetPayload<{
  include: {
    conversation: true;
  };
}>;

class MessageService {
  public async getMessages(
    conversationId: string,
    limit = 50,
    cursor?: string
  ): Promise<{ messages: FullMessageById[]; nextCursor: string | null }> {
    try {
      // Negative take fetches the last N records in ascending order.
      // With a cursor it returns N records *before* the cursor.
      const messages = await prisma.message.findMany({
        where: { conversationId },
        include: { conversation: true },
        orderBy: { createdAt: "asc" },
        take: -(limit + 1),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = messages.length > limit;
      if (hasMore) messages.shift(); // remove oldest extra record
      const nextCursor = hasMore ? messages[0].id : null;

      logger.info({ conversationId, count: messages.length }, "Retrieved messages");
      return { messages, nextCursor };
    } catch (error) {
      logger.error({ conversationId, error }, "Failed to get messages");
      throw error;
    }
  }
}

export default MessageService;
