import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { ConversationRepository } from './conversation.repository';
import { UserRepository } from '../user/user.repository';
import { BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { ConversationType, ParticipantRole } from '../../generated/prisma/client';

describe('ConversationService', () => {
  let service: ConversationService;
  let conversationRepository: jest.Mocked<ConversationRepository>;
  let userRepository: jest.Mocked<UserRepository>;

  const currentUserId = 'user-1';
  const otherUserId = 'user-2';
  const thirdUserId = 'user-3';

  const mockUsers = [
    { id: currentUserId, username: 'user1', email: 'u1@test.com', fullName: 'User 1', passwordHash: 'h', avatar: null, createdAt: new Date(), updatedAt: new Date() },
    { id: otherUserId, username: 'user2', email: 'u2@test.com', fullName: 'User 2', passwordHash: 'h', avatar: null, createdAt: new Date(), updatedAt: new Date() },
    { id: thirdUserId, username: 'user3', email: 'u3@test.com', fullName: 'User 3', passwordHash: 'h', avatar: null, createdAt: new Date(), updatedAt: new Date() },
  ];

  const mockConversation: any = {
    id: 'conv-1',
    type: ConversationType.PRIVATE,
    title: null,
    avatar: null,
    lastMessageId: null,
    lastMessageAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [
      { id: 'p1', conversationId: 'conv-1', userId: currentUserId, role: ParticipantRole.MEMBER, joinedAt: new Date(), lastReadMessageId: null, user: mockUsers[0] },
      { id: 'p2', conversationId: 'conv-1', userId: otherUserId, role: ParticipantRole.MEMBER, joinedAt: new Date(), lastReadMessageId: null, user: mockUsers[1] },
    ],
    messages: [],
  };

  beforeEach(async () => {
    const mockConvRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findUserConversations: jest.fn(),
      findPrivateConversationBetween: jest.fn(),
      isParticipant: jest.fn(),
      getParticipant: jest.fn(),
      addParticipant: jest.fn(),
      removeParticipant: jest.fn(),
      updateLastMessage: jest.fn(),
      updateLastReadMessage: jest.fn(),
    };

    const mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findManyByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: ConversationRepository, useValue: mockConvRepo },
        { provide: UserRepository, useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    conversationRepository = module.get(ConversationRepository);
    userRepository = module.get(UserRepository);
  });

  describe('createConversation (PRIVATE)', () => {
    it('should return existing conversation if private conversation already exists', async () => {
      userRepository.findManyByIds.mockResolvedValue([mockUsers[0], mockUsers[1]]);
      conversationRepository.findPrivateConversationBetween.mockResolvedValue(mockConversation);

      const result = await service.createConversation(currentUserId, {
        type: ConversationType.PRIVATE,
        participantIds: [otherUserId],
      });

      expect(conversationRepository.findPrivateConversationBetween).toHaveBeenCalledWith(
        currentUserId,
        otherUserId,
      );
      expect(conversationRepository.create).not.toHaveBeenCalled();
      expect(result.id).toBe(mockConversation.id);
    });

    it('should create new private conversation if one does not exist', async () => {
      userRepository.findManyByIds.mockResolvedValue([mockUsers[0], mockUsers[1]]);
      conversationRepository.findPrivateConversationBetween.mockResolvedValue(null);
      conversationRepository.create.mockResolvedValue(mockConversation);

      const result = await service.createConversation(currentUserId, {
        type: ConversationType.PRIVATE,
        participantIds: [otherUserId],
      });

      expect(conversationRepository.create).toHaveBeenCalled();
      expect(result.id).toBe(mockConversation.id);
    });

    it('should throw BadRequestException if trying to chat with self', async () => {
      userRepository.findManyByIds.mockResolvedValue([mockUsers[0]]);

      await expect(
        service.createConversation(currentUserId, {
          type: ConversationType.PRIVATE,
          participantIds: [currentUserId],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if any participant does not exist', async () => {
      userRepository.findManyByIds.mockResolvedValue([mockUsers[0]]); // otherUser missing

      await expect(
        service.createConversation(currentUserId, {
          type: ConversationType.PRIVATE,
          participantIds: ['non-existent-user'],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createConversation (GROUP)', () => {
    it('should create group conversation with creator as OWNER', async () => {
      userRepository.findManyByIds.mockResolvedValue([mockUsers[0], mockUsers[1], mockUsers[2]]);
      const groupMock = {
        ...mockConversation,
        id: 'group-1',
        type: ConversationType.GROUP,
        title: 'Project Team',
      };
      conversationRepository.create.mockResolvedValue(groupMock);

      const result = await service.createConversation(currentUserId, {
        type: ConversationType.GROUP,
        participantIds: [otherUserId, thirdUserId],
        title: 'Project Team',
      });

      expect(conversationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ConversationType.GROUP,
          title: 'Project Team',
          participants: expect.arrayContaining([
            { userId: currentUserId, role: ParticipantRole.OWNER },
            { userId: otherUserId, role: ParticipantRole.MEMBER },
            { userId: thirdUserId, role: ParticipantRole.MEMBER },
          ]),
        }),
      );
      expect(result.id).toBe('group-1');
    });
  });

  describe('getConversationById', () => {
    it('should return conversation if user is participant', async () => {
      conversationRepository.findById.mockResolvedValue(mockConversation);

      const result = await service.getConversationById(mockConversation.id, currentUserId);
      expect(result.id).toBe(mockConversation.id);
    });

    it('should throw NotFoundException if conversation not found', async () => {
      conversationRepository.findById.mockResolvedValue(null);

      await expect(
        service.getConversationById('non-existent-id', currentUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not participant', async () => {
      conversationRepository.findById.mockResolvedValue(mockConversation);

      await expect(
        service.getConversationById(mockConversation.id, 'unauthorized-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
