import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { CreateReportDto, CreateBlockDto } from './dto/moderation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('report')
  @HttpCode(HttpStatus.CREATED)
  async report(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderationService.reportUser(user.userId, dto);
  }

  @Post('block')
  @HttpCode(HttpStatus.CREATED)
  async block(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBlockDto,
  ) {
    return this.moderationService.blockUser(user.userId, dto);
  }

  @Delete('block/:userId')
  @HttpCode(HttpStatus.OK)
  async unblock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
  ) {
    return this.moderationService.unblockUser(user.userId, targetUserId);
  }
}
