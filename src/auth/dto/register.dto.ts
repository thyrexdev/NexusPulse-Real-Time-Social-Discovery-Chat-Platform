import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain alphanumeric characters and underscores',
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  fullName: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 100, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
