import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { SendMessageDto, GetMessagesQueryDto, UpdateMessageDto } from './dto/message.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller()
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendMessage(conversationId, user.userId, dto);
  }

  @Get('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.OK)
  async getMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messageService.getMessages(conversationId, user.userId, query);
  }

  @Patch('messages/:messageId')
  @HttpCode(HttpStatus.OK)
  async editMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messageService.editMessage(messageId, user.userId, dto);
  }

  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messageService.deleteMessage(messageId, user.userId);
  }
}
