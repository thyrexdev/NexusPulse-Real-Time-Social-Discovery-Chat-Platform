import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MessageRepository, MessageWithSender } from './message.repository';
import { ConversationRepository } from '../conversation/conversation.repository';
import { SendMessageDto, GetMessagesQueryDto, UpdateMessageDto } from './dto/message.dto';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  // Idempotency cache: conversationId:senderId:clientMessageId -> MessageWithSender (TTL 60s)
  private readonly idempotencyCache = new Map<
    string,
    { message: MessageWithSender; expiresAt: number }
  >();

  // In-flight promise tracker to collapse concurrent simultaneous requests with identical clientMessageId
  private readonly inFlightRequests = new Map<string, Promise<MessageWithSender>>();

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<MessageWithSender> {
    if (!dto.content && !dto.attachmentUrl) {
      throw new BadRequestException('Message must have either content or an attachment');
    }

    // Check idempotency if client provided clientMessageId
    if (dto.clientMessageId) {
      const idempotencyKey = `${conversationId}:${senderId}:${dto.clientMessageId}`;

      // 1. Check completed cache
      const cached = this.idempotencyCache.get(idempotencyKey);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.debug(
          `Idempotent hit: returning existing message ${cached.message.id} for clientMessageId ${dto.clientMessageId}`,
        );
        return cached.message;
      }

      // 2. Check in-flight promise (collapses concurrent simultaneous duplicate sends)
      const inFlight = this.inFlightRequests.get(idempotencyKey);
      if (inFlight) {
        this.logger.debug(
          `Idempotent in-flight join: awaiting active send for clientMessageId ${dto.clientMessageId}`,
        );
        return inFlight;
      }

      // 3. Initiate new in-flight execution
      const sendPromise = this.executeSendMessage(conversationId, senderId, dto, idempotencyKey);
      this.inFlightRequests.set(idempotencyKey, sendPromise);

      try {
        return await sendPromise;
      } finally {
        this.inFlightRequests.delete(idempotencyKey);
      }
    }

    return this.executeSendMessage(conversationId, senderId, dto);
  }

  private async executeSendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
    idempotencyKey?: string,
  ): Promise<MessageWithSender> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === senderId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const message = await this.messageRepository.create({
      conversationId,
      senderId,
      content: dto.content,
      attachmentUrl: dto.attachmentUrl,
      type: dto.type,
    });

    if (idempotencyKey) {
      this.idempotencyCache.set(idempotencyKey, {
        message,
        expiresAt: Date.now() + 60_000, // 60-second idempotency window
      });

      // Cleanup expired items if cache grows
      if (this.idempotencyCache.size > 1000) {
        const now = Date.now();
        for (const [key, val] of this.idempotencyCache.entries()) {
          if (val.expiresAt <= now) this.idempotencyCache.delete(key);
        }
      }
    }

    this.logger.log(
      `Message ${message.id} sent by ${senderId} in conversation ${conversationId}`,
    );

    return message;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    query: GetMessagesQueryDto,
  ): Promise<{ messages: MessageWithSender[]; nextCursor: string | null; hasMore: boolean }> {
    const isParticipant = await this.conversationRepository.isParticipant(
      conversationId,
      userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not authorized to view messages in this conversation');
    }

    return this.messageRepository.findMessages(
      conversationId,
      query.limit || 50,
      query.cursor,
    );
  }

  async editMessage(
    messageId: string,
    userId: string,
    dto: UpdateMessageDto,
  ): Promise<MessageWithSender> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.deletedAt) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const updated = await this.messageRepository.updateContent(messageId, dto.content);
    this.logger.log(`Message ${messageId} edited by ${userId}`);
    return updated;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.deletedAt) {
      throw new BadRequestException('Message is already deleted');
    }

    if (message.senderId !== userId) {
      // Check if user is conversation owner/admin
      const participant = await this.conversationRepository.getParticipant(
        message.conversationId,
        userId,
      );
      if (!participant || participant.role === 'MEMBER') {
        throw new ForbiddenException('You do not have permission to delete this message');
      }
    }

    await this.messageRepository.softDelete(messageId);
    this.logger.log(`Message ${messageId} deleted by ${userId}`);
    return { success: true, message: 'Message deleted successfully' };
  }
}
