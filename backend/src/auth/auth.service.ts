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
import { GeoLocation } from '../common/utils/geo.util';

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

  async createStranger(geo?: GeoLocation) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const username = `Stranger_${randomSuffix}`;
    const email = `stranger_${uniqueId}_${Date.now()}@stranger.local`;

    // Fast static pre-hashed string to avoid CPU-bound bcrypt delay on every anonymous visitor
    const dummyPasswordHash = '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789dummyhashforstrangers';

    const countryLabel = geo?.country ? ` from ${geo.country} ${geo.flag}` : '';
    const user = await this.userRepository.create({
      email,
      username,
      fullName: `Stranger${countryLabel}`,
      passwordHash: dummyPasswordHash,
      avatar: geo?.flag || '👤',
    });

    this.logger.log(
      `Stranger guest session created: ${user.id} (${username}) from ${geo?.country || 'Unknown'} (${geo?.flag || ''})`,
    );

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
      geo,
    };
  }

  async updateProfile(userId: string, data: { username?: string }) {
    let cleanName = data.username?.trim();
    if (!cleanName) {
      const current = await this.getProfile(userId);
      return { user: current };
    }

    // Sanitize: allow alphanumeric, Arabic, spaces, dashes, underscores, max 24 chars
    cleanName = cleanName.replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim().slice(0, 24);
    if (!cleanName) {
      const current = await this.getProfile(userId);
      return { user: current };
    }

    // Check if unique or append random suffix if collision with another user
    const existing = await this.userRepository.findByUsername(cleanName);
    let finalUsername = cleanName;
    if (existing && existing.id !== userId) {
      finalUsername = `${cleanName}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const updated = await this.userRepository.update(userId, {
      username: finalUsername,
      fullName: finalUsername,
    });

    const token = this.generateToken({
      sub: updated.id,
      email: updated.email,
      username: updated.username,
    });

    return {
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        fullName: updated.fullName,
        avatar: updated.avatar,
        createdAt: updated.createdAt,
      },
      accessToken: token,
    };
  }

  private generateToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
