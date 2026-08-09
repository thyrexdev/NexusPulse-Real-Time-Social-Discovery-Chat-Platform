import type { Conversation, ConversationParticipant } from "@prisma/client";

export interface CreateConversationDTO {
  participantIds: string[];
  title?: string;
}

export interface GetByProposalIdDTO {
  proposalId: string;
  participantIds: string[];
}

export type ConversationWithParticipants = Conversation & {
  participants: ConversationParticipant[];
};

export interface GetOrCreateByProposalIdResult {
  conversation: ConversationWithParticipants;
  created: boolean;
}

export interface IConversationService {
  createConversation(data: CreateConversationDTO): Promise<Conversation>;
  getConversationById(id: string): Promise<ConversationWithParticipants | null>;
  getUserConversations(userId: string): Promise<ConversationWithParticipants[]>;
  getOrCreateByProposalId(data: GetByProposalIdDTO): Promise<GetOrCreateByProposalIdResult>;
}
