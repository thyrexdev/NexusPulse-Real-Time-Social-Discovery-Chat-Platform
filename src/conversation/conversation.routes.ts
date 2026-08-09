import { Router } from "express";
import ConversationController from "./conversation.controller.js";
import { AuthGuard } from "@rizlax-org/shared";
import { validator } from "../../middlewares/validator.js";
import { createConversationSchema, getConversationByIdSchema, getByProposalIdSchema } from "./conversation.schema.js";

interface IConversationController {
  createConversation: ConversationController["createConversation"];
  getConversationById: ConversationController["getConversationById"];
  getUserConversations: ConversationController["getUserConversations"];
  getByProposalId: ConversationController["getByProposalId"];
}

export const createConversationRouter = (
  conversationController: IConversationController
): Router => {
  const router = Router();

  router.use(AuthGuard);

  router.post(
    "/",
    validator(createConversationSchema),
    conversationController.createConversation
  );

  router.get(
    "/by-proposal/:proposalId",
    validator(getByProposalIdSchema),
    conversationController.getByProposalId
  );

  router.get(
    "/:id",
    validator(getConversationByIdSchema),
    conversationController.getConversationById
  );

  router.get("/", conversationController.getUserConversations);

  return router;
};
