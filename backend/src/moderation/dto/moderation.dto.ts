import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  reportedUserId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reason: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  details?: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}

export class CreateBlockDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}
