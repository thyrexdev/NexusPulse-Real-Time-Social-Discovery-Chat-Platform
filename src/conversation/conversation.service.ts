import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConversationRepository, ConversationWithDetails } from './conversation.repository';
import { UserRepository } from '../user/user.repository';
import { CreateConversationDto, AddParticipantDto } from './dto/conversation.dto';
import { ConversationType, ParticipantRole } from '../../generated/prisma/client';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createConversation(
    currentUserId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationWithDetails> {
    // Collect and deduplicate all participant IDs
    const rawIds = [...dto.participantIds, currentUserId];
    const uniqueIds = Array.from(new Set(rawIds));

    // Validate users exist in database
    const existingUsers = await this.userRepository.findManyByIds(uniqueIds);
    if (existingUsers.length !== uniqueIds.length) {
      const foundIds = new Set(existingUsers.map((u) => u.id));
      const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`One or more users not found: ${missingIds.join(', ')}`);
    }

    if (dto.type === ConversationType.PRIVATE) {
      // Must have exactly two distinct participants
      if (uniqueIds.length !== 2) {
        throw new BadRequestException(
          'Private conversation must have exactly two distinct participants',
        );
      }

      const otherUserId = uniqueIds.find((id) => id !== currentUserId)!;

      // Check if private conversation already exists between these two users (Idempotent)
      const existingConversation =
        await this.conversationRepository.findPrivateConversationBetween(
          currentUserId,
          otherUserId,
        );

      if (existingConversation) {
        this.logger.log(
          `Returning existing private conversation ${existingConversation.id} between ${currentUserId} and ${otherUserId}`,
        );
        return existingConversation;
      }

      // Create new private conversation
      const conversation = await this.conversationRepository.create({
        type: ConversationType.PRIVATE,
        participants: [
          { userId: currentUserId, role: ParticipantRole.MEMBER },
          { userId: otherUserId, role: ParticipantRole.MEMBER },
        ],
      });

      this.logger.log(
        `Created private conversation ${conversation.id} between ${currentUserId} and ${otherUserId}`,
      );
      return conversation;
    }

    // Group conversation
    if (uniqueIds.length < 2) {
      throw new BadRequestException('Group conversation must contain at least 2 participants');
    }

    const participants = uniqueIds.map((userId) => ({
      userId,
      role: userId === currentUserId ? ParticipantRole.OWNER : ParticipantRole.MEMBER,
    }));

    const conversation = await this.conversationRepository.create({
      type: ConversationType.GROUP,
      title: dto.title || 'Group Chat',
      avatar: dto.avatar,
      participants,
    });

    this.logger.log(
      `Created group conversation ${conversation.id} by ${currentUserId} with ${uniqueIds.length} participants`,
    );
    return conversation;
  }

  async getConversationById(
    conversationId: string,
    currentUserId: string,
  ): Promise<ConversationWithDetails> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === currentUserId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return conversation;
  }

  async getUserConversations(currentUserId: string): Promise<ConversationWithDetails[]> {
    return this.conversationRepository.findUserConversations(currentUserId);
  }

  async addParticipant(
    conversationId: string,
    currentUserId: string,
    dto: AddParticipantDto,
  ) {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Cannot add participants to a private conversation');
    }

    // Verify requester has permission (OWNER or ADMIN)
    const requester = conversation.participants.find((p) => p.userId === currentUserId);
    if (!requester || (requester.role !== ParticipantRole.OWNER && requester.role !== ParticipantRole.ADMIN)) {
      throw new ForbiddenException('Only conversation owners or admins can add participants');
    }

    // Verify target user exists
    const targetUser = await this.userRepository.findById(dto.userId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if already participant
    const alreadyParticipant = conversation.participants.some((p) => p.userId === dto.userId);
    if (alreadyParticipant) {
      throw new ConflictException('User is already a participant in this conversation');
    }

    await this.conversationRepository.addParticipant(
      conversationId,
      dto.userId,
      dto.role || ParticipantRole.MEMBER,
    );

    return this.getConversationById(conversationId, currentUserId);
  }

  async removeParticipant(
    conversationId: string,
    currentUserId: string,
    targetUserId: string,
  ) {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isSelf = currentUserId === targetUserId;
    const requester = conversation.participants.find((p) => p.userId === currentUserId);

    if (!requester) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    if (!isSelf) {
      if (conversation.type !== ConversationType.GROUP) {
        throw new BadRequestException('Cannot remove participants from private conversations');
      }
      if (requester.role !== ParticipantRole.OWNER && requester.role !== ParticipantRole.ADMIN) {
        throw new ForbiddenException('Only owners or admins can remove other participants');
      }
    }

    const targetParticipant = conversation.participants.find((p) => p.userId === targetUserId);
    if (!targetParticipant) {
      throw new NotFoundException('Participant not found in conversation');
    }

    await this.conversationRepository.removeParticipant(conversationId, targetUserId);
    return { success: true, message: isSelf ? 'Left conversation' : 'Participant removed' };
  }
}
