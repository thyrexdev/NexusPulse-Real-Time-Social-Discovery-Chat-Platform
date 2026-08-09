import type { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@rizlax-org/shared";
import type { IConversationService } from "./conversation.types.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "@rizlax-org/shared";
import { logger } from "@rizlax-org/shared";

class ConversationController {
  private conversationService: IConversationService;

  constructor(conversationService: IConversationService) {
    this.conversationService = conversationService;
  }

  private validateUserAccess(
    conversation: { participants?: { userId: string }[] } | null,
    userId: string
  ) {
    if (!conversation) {
      throw new NotFoundError("Conversation not found");
    }

    const participants = conversation.participants ?? [];
    const isParticipant = participants.some(
      (participant: { userId: string }) => participant.userId === userId
    );

    if (!isParticipant) {
      throw new ForbiddenError("Access denied");
    }
  }

  public createConversation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { participantIds, title } = req.body;

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        throw new BadRequestError("participantIds must be a non-empty array");
      }

      if (!participantIds.includes(req.user!.userId)) {
        participantIds.push(req.user!.userId);
      }

      const conversation = await this.conversationService.createConversation({
        participantIds,
        title,
      });

      logger.info({ conversationId: conversation.id, userId: req.user!.userId }, "Conversation created via API");
      return res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  };

  public getConversationById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = req.params.id as string;
      const conversation = await this.conversationService.getConversationById(id);
      this.validateUserAccess(conversation, req.user!.userId);
      return res.status(200).json(conversation);
    } catch (err) {
      next(err);
    }
  };

  public getUserConversations = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const conversations = await this.conversationService.getUserConversations(req.user!.userId);
      return res.status(200).json(conversations);
    } catch (err) {
      next(err);
    }
  };

  public getByProposalId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const proposalId = req.params.proposalId as string;
      const participantIds = req.query.participantIds as string[] | string | undefined;
      const ids: string[] = Array.isArray(participantIds)
        ? participantIds
        : participantIds
        ? [participantIds]
        : [];

      if (!ids.includes(req.user!.userId)) {
        ids.push(req.user!.userId);
      }

      const { conversation, created } = await this.conversationService.getOrCreateByProposalId({
        proposalId,
        participantIds: ids,
      });

      logger.info({ proposalId, conversationId: conversation.id, created, userId: req.user!.userId }, "getByProposalId");
      return res.status(created ? 201 : 200).json(conversation);
    } catch (err) {
      next(err);
    }
  };
}

export default ConversationController;
