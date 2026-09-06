import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRepository } from '../user/user.repository';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-uuid-1',
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    passwordHash: '$2a$10$hashedpassword123',
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findManyByIds: jest.fn(),
    };

    const mockJwt = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should successfully register a new user and return a token', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);

      const result = await service.register({
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'password123',
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(userRepository.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          username: 'differentuser',
          email: 'test@example.com',
          fullName: 'Test User',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(mockUser);

      await expect(
        service.register({
          username: 'testuser',
          email: 'new@example.com',
          fullName: 'Test User',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully login with email and valid password', async () => {
      const plainPassword = 'password123';
      const hash = await bcrypt.hash(plainPassword, 10);
      const userWithRealHash = { ...mockUser, passwordHash: hash };

      userRepository.findByEmail.mockResolvedValue(userWithRealHash);

      const result = await service.login({
        identifier: 'test@example.com',
        password: plainPassword,
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.username).toBe('testuser');
    });

    it('should successfully login with username and valid password', async () => {
      const plainPassword = 'password123';
      const hash = await bcrypt.hash(plainPassword, 10);
      const userWithRealHash = { ...mockUser, passwordHash: hash };

      userRepository.findByUsername.mockResolvedValue(userWithRealHash);

      const result = await service.login({
        identifier: 'testuser',
        password: plainPassword,
      });

      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          identifier: 'nonexistent@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login({
          identifier: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without passwordHash', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser.id);
      expect(result.id).toBe(mockUser.id);
      expect(result.username).toBe(mockUser.username);
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
