import type { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@rizlax-org/shared";
import type { IMessageService } from "./message.types.js";
import { BadRequestError } from "@rizlax-org/shared";
import { logger } from "@rizlax-org/shared";


class MessageController {
  private messageService: IMessageService;

  constructor(messageService: IMessageService) {
    this.messageService = messageService;
  }

  public getMessages = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { conversationId } = req.params;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 50;
      const cursor = req.query.cursor as string | undefined;

      if (!conversationId) {
        throw new BadRequestError("conversationId is required");
      }

      const result = await this.messageService.getMessages(
        conversationId as string,
        limit,
        cursor
      );

      logger.info({ conversationId, userId: req.user!.userId }, "Messages retrieved via API");
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

export default MessageController;
