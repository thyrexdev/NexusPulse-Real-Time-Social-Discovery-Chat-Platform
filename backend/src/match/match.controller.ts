import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { MatchService } from './match.service';
import { JoinQueueDto, SkipMatchDto, LeaveSessionDto } from './dto/match.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('match')
@UseGuards(JwtAuthGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('active')
  async getActiveSession(@CurrentUser() user: AuthenticatedUser) {
    const session = await this.matchService.getActiveSession(user.userId);
    return { session };
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ) {
    const sessions = await this.matchService.getSessionHistory(
      user.userId,
      limit ? Number(limit) : 20,
    );
    return { sessions };
  }

  @Get('stats')
  async getStats() {
    return this.matchService.getQueueStats();
  }

  @Post('skip')
  @HttpCode(HttpStatus.OK)
  async skipMatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SkipMatchDto,
  ) {
    return this.matchService.skipMatch(user.userId, dto.sessionId);
  }

  @Post('leave')
  @HttpCode(HttpStatus.OK)
  async leaveSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LeaveSessionDto,
  ) {
    return this.matchService.leaveSession(user.userId, dto.sessionId);
  }
}
