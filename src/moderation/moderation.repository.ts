import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Report, Block, ReportStatus } from '../../generated/prisma/client';

@Injectable()
export class ModerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(data: {
    reporterId: string;
    reportedUserId: string;
    reason: string;
    details?: string;
    conversationId?: string;
  }): Promise<Report> {
    return this.prisma.report.create({
      data: {
        reporterId: data.reporterId,
        reportedUserId: data.reportedUserId,
        reason: data.reason,
        details: data.details,
        conversationId: data.conversationId,
        status: ReportStatus.PENDING,
      },
    });
  }

  async blockUser(blockerId: string, blockedUserId: string): Promise<Block> {
    return this.prisma.block.upsert({
      where: {
        blockerId_blockedUserId: {
          blockerId,
          blockedUserId,
        },
      },
      create: {
        blockerId,
        blockedUserId,
      },
      update: {},
    });
  }

  async unblockUser(blockerId: string, blockedUserId: string): Promise<void> {
    await this.prisma.block.deleteMany({
      where: {
        blockerId,
        blockedUserId,
      },
    });
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userA, blockedUserId: userB },
          { blockerId: userB, blockedUserId: userA },
        ],
      },
    });
    return !!block;
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedUserId: userId }],
      },
      select: {
        blockerId: true,
        blockedUserId: true,
      },
    });

    const set = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === userId) set.add(b.blockedUserId);
      if (b.blockedUserId === userId) set.add(b.blockerId);
    }
    return Array.from(set);
  }
}
