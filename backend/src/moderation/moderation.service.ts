import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ModerationRepository } from './moderation.repository';
import { CreateReportDto, CreateBlockDto } from './dto/moderation.dto';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly moderationRepository: ModerationRepository) {}

  async reportUser(reporterId: string, dto: CreateReportDto) {
    if (reporterId === dto.reportedUserId) {
      throw new BadRequestException('You cannot report yourself');
    }

    const report = await this.moderationRepository.createReport({
      reporterId,
      reportedUserId: dto.reportedUserId,
      reason: dto.reason,
      details: dto.details,
      conversationId: dto.conversationId,
    });

    this.logger.warn(
      `User ${reporterId} reported user ${dto.reportedUserId} for: ${dto.reason}`,
    );

    return report;
  }

  async blockUser(blockerId: string, dto: CreateBlockDto) {
    if (blockerId === dto.targetUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const block = await this.moderationRepository.blockUser(blockerId, dto.targetUserId);
    this.logger.log(`User ${blockerId} blocked user ${dto.targetUserId}`);
    return block;
  }

  async unblockUser(blockerId: string, targetUserId: string) {
    await this.moderationRepository.unblockUser(blockerId, targetUserId);
    return { success: true, message: 'User unblocked successfully' };
  }

  async isPairBlocked(userA: string, userB: string): Promise<boolean> {
    return this.moderationRepository.isBlocked(userA, userB);
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    return this.moderationRepository.getBlockedUserIds(userId);
  }
}
