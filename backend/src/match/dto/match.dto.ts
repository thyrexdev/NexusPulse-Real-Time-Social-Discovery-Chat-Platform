import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class JoinQueueDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  topic?: string;
}

export class SkipMatchDto {
  @IsString()
  sessionId: string;

  @IsBoolean()
  @IsOptional()
  autoRequeue?: boolean;
}

export class LeaveSessionDto {
  @IsString()
  sessionId: string;
}
