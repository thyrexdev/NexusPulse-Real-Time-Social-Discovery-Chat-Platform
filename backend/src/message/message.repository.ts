import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Message, MessageType, Prisma } from '../../generated/prisma/client';

export type MessageWithSender = Prisma.MessageGetPayload<{
  include: {
    sender: {
      select: {
        id: true;
        username: true;
        fullName: true;
        avatar: true;
      };
    };
  };
}>;

const senderSelect = {
  id: true,
  username: true,
  fullName: true,
  avatar: true,
};

@Injectable()
export class MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    conversationId: string;
    senderId: string;
    content?: string;
    attachmentUrl?: string;
    type?: MessageType;
  }): Promise<MessageWithSender> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content,
          attachmentUrl: data.attachmentUrl,
          type: data.type || MessageType.TEXT,
          createdAt: now,
        },
        include: {
          sender: {
            select: senderSelect,
          },
        },
      });

      await tx.conversation.update({
        where: { id: data.conversationId },
        data: {
          lastMessageId: message.id,
          lastMessageAt: now,
        },
      });

      return message;
    });
  }

  async findMessages(
    conversationId: string,
    limit = 50,
    cursor?: string,
  ): Promise<{ messages: MessageWithSender[]; nextCursor: string | null; hasMore: boolean }> {
    const rawMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      include: {
        sender: {
          select: senderSelect,
        },
      },
      orderBy: { createdAt: 'asc' },
      take: -(limit + 1),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rawMessages.length > limit;
    if (hasMore) {
      rawMessages.shift();
    }

    const nextCursor = hasMore && rawMessages.length > 0 ? rawMessages[0].id : null;

    return {
      messages: rawMessages,
      nextCursor,
      hasMore,
    };
  }

  async findById(id: string): Promise<MessageWithSender | null> {
    return this.prisma.message.findUnique({
      where: { id },
      include: {
        sender: {
          select: senderSelect,
        },
      },
    });
  }

  async updateContent(id: string, content: string): Promise<MessageWithSender> {
    return this.prisma.message.update({
      where: { id },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: senderSelect,
        },
      },
    });
  }

  async softDelete(id: string): Promise<Message> {
    return this.prisma.message.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
