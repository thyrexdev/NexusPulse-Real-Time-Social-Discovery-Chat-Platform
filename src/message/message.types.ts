
export interface SendMessageDTO {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
}

export interface IMessageService {
  getMessages(conversationId: string, limit?: number, cursor?: string): Promise<{ messages: any[]; nextCursor: string | null }>;
}
