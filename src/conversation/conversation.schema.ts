import { z } from "zod";

export const createConversationSchema = z.object({
  body: z.object({
    participantIds: z.array(z.string().uuid()).min(1, "At least one participant is required"),
    title: z.string().optional(),
  }),
});

export const getConversationByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid conversation ID"),
  }),
});

export const getByProposalIdSchema = z.object({
  params: z.object({
    proposalId: z.string().uuid("Invalid proposal ID"),
  }),
  query: z.object({
    participantIds: z
      .union([z.string(), z.array(z.string())])
      .transform((val) => (Array.isArray(val) ? val : [val]))
      .pipe(z.array(z.string().uuid()).min(1, "At least one participantId is required"))
      .optional()
      .default([]),
  }),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type GetConversationByIdInput = z.infer<typeof getConversationByIdSchema>;
export type GetByProposalIdInput = z.infer<typeof getByProposalIdSchema>;
