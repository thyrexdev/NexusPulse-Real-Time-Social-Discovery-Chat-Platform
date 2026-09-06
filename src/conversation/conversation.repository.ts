import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Conversation, ConversationType, ParticipantRole, Prisma } from '../../generated/prisma/client';

export type ConversationWithDetails = Prisma.ConversationGetPayload<{
  include: {
    participants: {
      include: {
        user: {
          select: {
            id: true;
            username: true;
            fullName: true;
            avatar: true;
          };
        };
      };
    };
    messages: {
      take: 1;
      orderBy: { createdAt: 'desc' };
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
    };
  };
}>;

const userSelect = {
  id: true,
  username: true,
  fullName: true,
  avatar: true,
};

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    type: ConversationType;
    title?: string;
    avatar?: string;
    participants: { userId: string; role: ParticipantRole }[];
  }): Promise<ConversationWithDetails> {
    return this.prisma.conversation.create({
      data: {
        type: data.type,
        title: data.title,
        avatar: data.avatar,
        participants: {
          create: data.participants.map((p) => ({
            userId: p.userId,
            role: p.role,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: userSelect,
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: userSelect,
            },
          },
        },
      },
    });
  }

  async findById(id: string): Promise<ConversationWithDetails | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: userSelect,
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: userSelect,
            },
          },
        },
      },
    });
  }

  async findUserConversations(userId: string): Promise<ConversationWithDetails[]> {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: userSelect,
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: userSelect,
            },
          },
        },
      },
      orderBy: [
        { lastMessageAt: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async findPrivateConversationBetween(userA: string, userB: string): Promise<ConversationWithDetails | null> {
    const candidateConversations = await this.prisma.conversation.findMany({
      where: {
        type: ConversationType.PRIVATE,
        AND: [
          { participants: { some: { userId: userA } } },
          { participants: { some: { userId: userB } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: userSelect,
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: userSelect,
            },
          },
        },
      },
    });

    const match = candidateConversations.find(
      (c) =>
        c.participants.length === 2 &&
        c.participants.some((p) => p.userId === userA) &&
        c.participants.some((p) => p.userId === userB),
    );

    return match || null;
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });
    return !!participant;
  }

  async getParticipant(conversationId: string, userId: string) {
    return this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });
  }

  async addParticipant(conversationId: string, userId: string, role: ParticipantRole = ParticipantRole.MEMBER) {
    return this.prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId,
        role,
      },
    });
  }

  async removeParticipant(conversationId: string, userId: string) {
    return this.prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });
  }

  async updateLastMessage(conversationId: string, messageId: string, timestamp: Date) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: messageId,
        lastMessageAt: timestamp,
      },
    });
  }

  async updateLastReadMessage(conversationId: string, userId: string, messageId: string) {
    return this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadMessageId: messageId,
      },
    });
  }
}
