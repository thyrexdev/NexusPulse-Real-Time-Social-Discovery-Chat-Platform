import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../user/user.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser, JwtPayload } from '../common/interfaces/authenticated-user.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingByEmail = await this.userRepository.findByEmail(dto.email.toLowerCase());
    if (existingByEmail) {
      throw new ConflictException('A user with this email address already exists');
    }

    const existingByUsername = await this.userRepository.findByUsername(dto.username);
    if (existingByUsername) {
      throw new ConflictException('A user with this username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.userRepository.create({
      email: dto.email.toLowerCase(),
      username: dto.username,
      fullName: dto.fullName,
      passwordHash,
      avatar: dto.avatar,
    });

    this.logger.log(`User registered successfully: ${user.id} (${user.username})`);

    const token = this.generateToken({
      sub: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const isEmail = dto.identifier.includes('@');
    const user = isEmail
      ? await this.userRepository.findByEmail(dto.identifier.toLowerCase())
      : await this.userRepository.findByUsername(dto.identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid email/username or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email/username or password');
    }

    this.logger.log(`User logged in successfully: ${user.id} (${user.username})`);

    const token = this.generateToken({
      sub: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      accessToken: token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private generateToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
