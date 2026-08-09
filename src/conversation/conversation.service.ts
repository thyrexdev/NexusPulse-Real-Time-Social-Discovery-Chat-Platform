import { prisma } from "../../db/prisma.js";
import { type Conversation, Prisma } from "@prisma/client";
import type { CreateConversationDTO, GetByProposalIdDTO, GetOrCreateByProposalIdResult } from "./conversation.types.js";
import { NotFoundError, logger, capturePrismaError } from "@rizlax-org/shared";

type FullConversationById = Prisma.ConversationGetPayload<{
  include: {
    participants: true;
    lastMessage: true;
  };
}>;

const uniqueParticipantIds = (participantIds: string[]) => [...new Set(participantIds)];

const hasExactParticipants = (
  conversation: { participants: { userId: string }[] },
  participantIds: string[]
) => {
  const normalizedIds = uniqueParticipantIds(participantIds);
  if (conversation.participants.length !== normalizedIds.length) {
    return false;
  }

  const participantSet = new Set(conversation.participants.map((participant) => participant.userId));
  return normalizedIds.every((participantId) => participantSet.has(participantId));
};

class ConversationService {
  public async createConversation(data: CreateConversationDTO): Promise<Conversation> {
    try {
      const participantIds = uniqueParticipantIds(data.participantIds);
      const candidateConversations = await prisma.conversation.findMany({
        where: {
          AND: participantIds.map((userId) => ({
            participants: {
              some: { userId },
            },
          })),
        },
        include: {
          participants: true,
        },
      });
      const existingConversation = candidateConversations.find((conversation: FullConversationById) =>
        hasExactParticipants(conversation, participantIds)
      );

      if (existingConversation) {
        logger.info({ conversationId: existingConversation.id }, "Conversation already exists");
        return existingConversation;
      }

      const conversation = await prisma.conversation.create({
        data: {
          title: data.title,
          participants: {
            create: participantIds.map((userId) => ({
              userId,
            })),
          },
        },
        include: {
          participants: true,
        },
      });

      logger.info({ conversationId: conversation.id }, "Conversation created");
      return conversation;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error as Prisma.PrismaClientKnownRequestError).code === "P2002") {
        capturePrismaError(error, { service: 'chat-service' });
        const participantIds = uniqueParticipantIds(data.participantIds);
        const conflict = await prisma.conversation.findFirst({
          where: {
            AND: participantIds.map((userId) => ({
              participants: { some: { userId } },
            })),
          },
          include: { participants: true, lastMessage: true },
        });
        if (conflict && hasExactParticipants(conflict, participantIds)) {
          logger.info({ conversationId: conflict.id }, "Resolved concurrent conversation creation race");
          return conflict;
        }
      }
      logger.error({ error }, "Failed to create conversation");
      throw error;
    }
  }

  public async getConversationById(id: string): Promise<FullConversationById | null> {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          participants: true,
          lastMessage: true,
        },
      });

      if (!conversation) {
        throw new NotFoundError("Conversation not found");
      }

      return conversation;
    } catch (error) {
      logger.error({ conversationId: id, error }, "Failed to get conversation by ID");
      throw error;
    }
  }

  public async getUserConversations(userId: string): Promise<FullConversationById[]> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId,
            },
          },
        },
        include: {
          participants: true,
          lastMessage: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      logger.info({ userId, count: conversations.length }, "Retrieved user conversations");
      return conversations;
    } catch (error) {
      logger.error({ userId, error }, "Failed to get user conversations");
      throw error;
    }
  }
  public async getOrCreateByProposalId(data: GetByProposalIdDTO): Promise<GetOrCreateByProposalIdResult> {
    const { proposalId } = data;
    const participantIds = uniqueParticipantIds(data.participantIds);
    try {
      const existing = await prisma.conversation.findUnique({
        where: { proposalId },
        include: { participants: true, lastMessage: true },
      });

      if (existing) {
        const missingParticipantIds = participantIds.filter(
          (participantId) =>
            !existing.participants.some(
              (participant: { userId: string }) => participant.userId === participantId
            )
        );

        if (missingParticipantIds.length === 0) {
          return { conversation: existing, created: false };
        }

        const repairedConversation = await prisma.conversation.update({
          where: { id: existing.id },
          data: {
            participants: {
              create: missingParticipantIds.map((userId) => ({ userId })),
            },
          },
          include: { participants: true, lastMessage: true },
        });

        logger.info(
          { proposalId, conversationId: existing.id, missingParticipantIds },
          "Added missing participants to proposal conversation"
        );

        return { conversation: repairedConversation, created: false };
      }

      const conversation = await prisma.conversation.create({
        data: {
          proposalId,
          participants: {
            create: participantIds.map((userId) => ({ userId })),
          },
        },
        include: { participants: true, lastMessage: true },
      });

      return { conversation, created: true };
    } catch (error) {
      // Two concurrent requests can both pass the findUnique check and then race
      // to create — only one wins. The loser gets a P2002 unique constraint error.
      // Recover by fetching the record the winner created.
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error as Prisma.PrismaClientKnownRequestError).code === "P2002") {
        capturePrismaError(error, { service: 'chat-service' });
        const existing = await prisma.conversation.findUnique({
          where: { proposalId },
          include: { participants: true, lastMessage: true },
        });
        if (existing) {
          logger.info({ proposalId, conversationId: existing.id }, "Resolved race condition: returning existing conversation");
          return { conversation: existing, created: false };
        }
      }
      logger.error({ proposalId, error }, "Failed to get or create conversation by proposalId");
      throw error;
    }
  }
}

export default ConversationService;
