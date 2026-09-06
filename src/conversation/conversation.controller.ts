import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto, AddParticipantDto } from './dto/conversation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationService.createConversation(user.userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUserConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.conversationService.getUserConversations(user.userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getConversationById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.conversationService.getConversationById(id, user.userId);
  }

  @Post(':id/participants')
  @HttpCode(HttpStatus.CREATED)
  async addParticipant(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddParticipantDto,
  ) {
    return this.conversationService.addParticipant(id, user.userId, dto);
  }

  @Delete(':id/participants/:userId')
  @HttpCode(HttpStatus.OK)
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.conversationService.removeParticipant(id, user.userId, targetUserId);
  }
}
