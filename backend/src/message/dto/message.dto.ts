import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../../../generated/prisma/client';

export class SendMessageDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000, { message: 'Message content cannot exceed 5000 characters' })
  content?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;

  @IsString()
  @IsOptional()
  @MaxLength(128, { message: 'clientMessageId cannot exceed 128 characters' })
  clientMessageId?: string;
}

export class GetMessagesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export class UpdateMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @MaxLength(5000, { message: 'Message content cannot exceed 5000 characters' })
  content: string;
}
