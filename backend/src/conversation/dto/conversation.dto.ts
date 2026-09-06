import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ArrayMinSize, ArrayUnique } from 'class-validator';
import { ConversationType, ParticipantRole } from '../../../generated/prisma/client';

export class CreateConversationDto {
  @IsEnum(ConversationType, { message: 'Type must be either PRIVATE or GROUP' })
  @IsNotEmpty()
  type: ConversationType;

  @IsArray()
  @ArrayMinSize(1, { message: 'participantIds must contain at least one recipient' })
  @ArrayUnique({ message: 'participantIds must not contain duplicates' })
  @IsString({ each: true })
  participantIds: string[];

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}

export class AddParticipantDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(ParticipantRole)
  @IsOptional()
  role?: ParticipantRole = ParticipantRole.MEMBER;
}
