import { Router } from "express";
import MessageController from "./message.controller.js";
import { AuthGuard } from "@rizlax-org/shared";
import { validator } from "../../middlewares/validator.js";
import { getMessagesSchema } from "./message.schema.js";

export const createMessageRouter = (
  messageController: MessageController
): Router => {
  const router = Router();

  router.use(AuthGuard);

  router.get(
    "/:conversationId/messages",
    validator(getMessagesSchema),
    messageController.getMessages
  );

  return router;
};
