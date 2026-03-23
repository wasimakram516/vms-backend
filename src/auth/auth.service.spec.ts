import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../common/enums/role.enum.js';

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'uuid-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: Role.Admin,
    passwordHash: '$2a$10$hashedpassword',
    ...overrides,
  }) as User;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmailWithPassword: jest.fn(),
            findById: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe('validateUser', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.validateUser('unknown@example.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user has no passwordHash', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(
        mockUser({ passwordHash: '' as unknown as string }),
      );

      await expect(service.validateUser('admin@example.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user is a Visitor', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser({ role: Role.Visitor }));

      await expect(service.validateUser('visitor@example.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when password does not match', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser());
      configService.get.mockReturnValue(undefined); // no master key

      // bcryptjs.compare will return false for a non-matching password against the mock hash
      await expect(service.validateUser('admin@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns the user when master key matches', async () => {
      const user = mockUser();
      usersService.findByEmailWithPassword.mockResolvedValue(user);
      configService.get.mockReturnValue('super-master-key');

      const result = await service.validateUser('admin@example.com', 'super-master-key');

      expect(result).toBe(user);
    });
  });

  describe('login', () => {
    it('returns accessToken and refreshToken, and updates last login', async () => {
      const user = mockUser();
      configService.get.mockReturnValue('7d');
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      usersService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.login(user);

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(user.id);
    });

    it('signs the JWT payload with the user id, role, and email', async () => {
      const user = mockUser();
      configService.get.mockReturnValue('7d');
      jwtService.signAsync.mockResolvedValue('token');
      usersService.updateLastLogin.mockResolvedValue(undefined);

      await service.login(user);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: user.id, role: user.role, email: user.email }),
      );
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when token is invalid', async () => {
      configService.get.mockReturnValue('refresh-secret');
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user no longer exists', async () => {
      configService.get.mockReturnValue('refresh-secret');
      jwtService.verifyAsync.mockResolvedValue({ sub: 'uuid-1', role: Role.Admin, email: 'a@b.com' });
      usersService.findById.mockResolvedValue(null);

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('returns new token pair on success', async () => {
      const user = mockUser();
      configService.get.mockReturnValue('7d');
      jwtService.verifyAsync.mockResolvedValue({ sub: user.id, role: user.role, email: user.email });
      usersService.findById.mockResolvedValue(user);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refresh('old-refresh-token');

      expect(result).toEqual({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });
    });
  });
});
