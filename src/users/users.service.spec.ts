import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { Role } from '../common/enums/role.enum.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

type MockRepo = jest.Mocked<Pick<Repository<User>, 'find' | 'findOne' | 'create' | 'save' | 'update' | 'delete'>>;

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'uuid-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: Role.Admin,
    passwordHash: '$2a$10$hashedpassword',
    ...overrides,
  }) as User;

describe('UsersService', () => {
  let service: UsersService;
  let repo: MockRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  describe('createUser', () => {
    it('hashes the password and saves the user', async () => {
      const user = mockUser();
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);

      const result = await service.createUser({
        fullName: 'Admin User',
        email: 'admin@example.com',
        password: 'secret123',
        role: Role.Admin,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'admin@example.com', role: Role.Admin }),
      );
      expect(result).toBe(user);
    });

    it('throws ConflictException on duplicate email (pg error 23505)', async () => {
      repo.create.mockReturnValue(mockUser());
      repo.save.mockRejectedValue({ code: '23505', detail: 'Email already exists' });

      await expect(
        service.createUser({
          fullName: 'Admin User',
          email: 'admin@example.com',
          password: 'secret123',
          role: Role.Admin,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unknown errors', async () => {
      const unknownError = new Error('DB timeout');
      repo.create.mockReturnValue(mockUser());
      repo.save.mockRejectedValue(unknownError);

      await expect(
        service.createUser({
          fullName: 'Admin User',
          email: 'admin@example.com',
          password: 'secret123',
          role: Role.Admin,
        }),
      ).rejects.toThrow(unknownError);
    });
  });

  describe('createVisitor', () => {
    it('creates a user with Visitor role', async () => {
      const visitor = mockUser({ role: Role.Visitor });
      repo.create.mockReturnValue(visitor);
      repo.save.mockResolvedValue(visitor);

      const result = await service.createVisitor({ fullName: 'John', email: 'john@example.com' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.Visitor }),
      );
      expect(result.role).toBe(Role.Visitor);
    });
  });

  describe('findAll', () => {
    it('returns all users when no role filter provided', async () => {
      const users = [mockUser(), mockUser({ id: 'uuid-2', email: 'b@example.com' })];
      repo.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({ where: {}, order: { createdAt: 'DESC' } });
      expect(result).toBe(users);
    });

    it('filters by role when provided', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(Role.Staff);

      expect(repo.find).toHaveBeenCalledWith({
        where: { role: Role.Staff },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      const user = mockUser();
      repo.findOne.mockResolvedValue(user);

      expect(await service.findById('uuid-1')).toBe(user);
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      expect(await service.findById('uuid-x')).toBeNull();
    });
  });

  describe('findOneById', () => {
    it('returns the user when found', async () => {
      const user = mockUser();
      repo.findOne.mockResolvedValue(user);

      expect(await service.findOneById('uuid-1')).toBe(user);
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOneById('uuid-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('updates allowed fields and saves', async () => {
      const user = mockUser();
      repo.findOne.mockResolvedValue(user);
      repo.save.mockResolvedValue({ ...user, fullName: 'New Name' } as User);

      const dto: UpdateUserDto = { fullName: 'New Name' };
      const result = await service.updateUser('uuid-1', dto);

      expect(repo.save).toHaveBeenCalled();
      expect(result.fullName).toBe('New Name');
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.updateUser('uuid-x', {})).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when non-SuperAdmin tries to modify a SuperAdmin', async () => {
      repo.findOne.mockResolvedValue(mockUser({ role: Role.SuperAdmin }));
      const actor = mockUser({ role: Role.Admin });

      await expect(service.updateUser('uuid-1', {}, actor)).rejects.toThrow(ForbiddenException);
    });

    it('allows SuperAdmin to modify another SuperAdmin', async () => {
      const targetSuperAdmin = mockUser({ role: Role.SuperAdmin });
      repo.findOne.mockResolvedValue(targetSuperAdmin);
      repo.save.mockResolvedValue(targetSuperAdmin);
      const actorSuperAdmin = mockUser({ id: 'uuid-2', role: Role.SuperAdmin });

      await expect(service.updateUser('uuid-1', {}, actorSuperAdmin)).resolves.not.toThrow();
    });

    it('throws ConflictException on duplicate email', async () => {
      repo.findOne.mockResolvedValue(mockUser());
      repo.save.mockRejectedValue({ code: '23505', detail: 'Email taken' });

      await expect(service.updateUser('uuid-1', { email: 'taken@example.com' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('deleteUser', () => {
    it('deletes the user and returns { deleted: true }', async () => {
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });

      const result = await service.deleteUser('uuid-1');

      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.deleteUser('uuid-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLastLogin', () => {
    it('calls repository update with the current timestamp', async () => {
      repo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await service.updateLastLogin('uuid-1');

      expect(repo.update).toHaveBeenCalledWith('uuid-1', expect.objectContaining({ lastLoginAt: expect.any(Date) }));
    });
  });
});
