import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { MessageRepository } from './message.repository';
import { ConversationRepository } from '../conversation/conversation.repository';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { MessageType } from '../../generated/prisma/client';

describe('MessageService', () => {
  let service: MessageService;
  let messageRepository: jest.Mocked<MessageRepository>;
  let conversationRepository: jest.Mocked<ConversationRepository>;

  const userId = 'user-1';
  const conversationId = 'conv-1';
  const messageId = 'msg-1';

  const mockSender = {
    id: userId,
    username: 'testuser',
    fullName: 'Test User',
    avatar: null,
  };

  const mockMessage: any = {
    id: messageId,
    conversationId,
    senderId: userId,
    content: 'Hello World',
    attachmentUrl: null,
    type: MessageType.TEXT,
    isEdited: false,
    createdAt: new Date(),
    editedAt: null,
    deletedAt: null,
    sender: mockSender,
  };

  const mockConversation: any = {
    id: conversationId,
    participants: [{ userId }],
  };

  beforeEach(async () => {
    const mockMsgRepo = {
      create: jest.fn(),
      findMessages: jest.fn(),
      findById: jest.fn(),
      updateContent: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockConvRepo = {
      findById: jest.fn(),
      isParticipant: jest.fn(),
      getParticipant: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: MessageRepository, useValue: mockMsgRepo },
        { provide: ConversationRepository, useValue: mockConvRepo },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    messageRepository = module.get(MessageRepository);
    conversationRepository = module.get(ConversationRepository);
  });

  describe('sendMessage', () => {
    it('should create and return message if user is participant', async () => {
      conversationRepository.findById.mockResolvedValue(mockConversation);
      messageRepository.create.mockResolvedValue(mockMessage);

      const result = await service.sendMessage(conversationId, userId, {
        content: 'Hello World',
      });

      expect(messageRepository.create).toHaveBeenCalledWith({
        conversationId,
        senderId: userId,
        content: 'Hello World',
        attachmentUrl: undefined,
        type: undefined,
      });
      expect(result.id).toBe(messageId);
    });

    it('should throw ForbiddenException if user is not participant in conversation', async () => {
      conversationRepository.findById.mockResolvedValue({
        id: conversationId,
        participants: [{ userId: 'different-user' }],
      } as any);

      await expect(
        service.sendMessage(conversationId, userId, { content: 'Hello' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if message has neither content nor attachment', async () => {
      await expect(
        service.sendMessage(conversationId, userId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages when user is participant', async () => {
      conversationRepository.isParticipant.mockResolvedValue(true);
      messageRepository.findMessages.mockResolvedValue({
        messages: [mockMessage],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.getMessages(conversationId, userId, { limit: 20 });
      expect(result.messages).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('should throw ForbiddenException if user is not participant', async () => {
      conversationRepository.isParticipant.mockResolvedValue(false);

      await expect(
        service.getMessages(conversationId, userId, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('editMessage', () => {
    it('should allow author to edit their own message', async () => {
      messageRepository.findById.mockResolvedValue(mockMessage);
      messageRepository.updateContent.mockResolvedValue({
        ...mockMessage,
        content: 'Updated content',
        isEdited: true,
      });

      const result = await service.editMessage(messageId, userId, {
        content: 'Updated content',
      });

      expect(result.content).toBe('Updated content');
      expect(result.isEdited).toBe(true);
    });

    it('should throw ForbiddenException if another user attempts to edit message', async () => {
      messageRepository.findById.mockResolvedValue(mockMessage);

      await expect(
        service.editMessage(messageId, 'other-user', { content: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete message when author deletes it', async () => {
      messageRepository.findById.mockResolvedValue(mockMessage);
      messageRepository.softDelete.mockResolvedValue({
        ...mockMessage,
        deletedAt: new Date(),
      });

      const result = await service.deleteMessage(messageId, userId);
      expect(result.success).toBe(true);
      expect(messageRepository.softDelete).toHaveBeenCalledWith(messageId);
    });
  });

  describe('idempotency', () => {
    it('should return cached message on duplicate send with same clientMessageId without re-inserting', async () => {
      conversationRepository.findById.mockResolvedValue(mockConversation);
      messageRepository.create.mockResolvedValue(mockMessage);

      const dto = { content: 'First send', clientMessageId: 'idemp-uuid-123' };

      // 1. Initial send
      const firstResult = await service.sendMessage(conversationId, userId, dto);
      expect(firstResult.id).toBe(messageId);
      expect(messageRepository.create).toHaveBeenCalledTimes(1);

      // 2. Retry send with identical clientMessageId (e.g. network reconnect or double-click)
      const secondResult = await service.sendMessage(conversationId, userId, dto);
      expect(secondResult.id).toBe(messageId);
      // Repository must NOT have been called a second time
      expect(messageRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should withstand 10 concurrent duplicate sends and produce exactly one database write', async () => {
      conversationRepository.findById.mockResolvedValue(mockConversation);
      messageRepository.create.mockResolvedValue(mockMessage);

      const dto = { content: 'Burst message', clientMessageId: 'burst-uuid-999' };

      // Dispatch 10 concurrent requests with identical clientMessageId
      const results = await Promise.all(
        Array.from({ length: 10 }).map(() => service.sendMessage(conversationId, userId, dto)),
      );

      // All 10 callers must receive the exact same message
      for (const res of results) {
        expect(res.id).toBe(messageId);
      }

      // Exactly 1 database write occurred
      expect(messageRepository.create).toHaveBeenCalledTimes(1);
    });
  });
});


