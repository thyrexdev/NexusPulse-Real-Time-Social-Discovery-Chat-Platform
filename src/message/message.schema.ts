import { z } from "zod";

export const getMessagesSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid("Invalid conversation ID"),
  }),
  query: z.object({
    limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 50),
    cursor: z.string().optional(),
  }),
});

export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
