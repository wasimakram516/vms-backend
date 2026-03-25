import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { User } from './entities/user.entity.js';
import { Role } from '../common/enums/role.enum.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async createVisitor(data: {
    fullName: string;
    email: string;
    phone?: string;
  }): Promise<User> {
    const password = randomBytes(32).toString('hex');
    return this.createUser({
      ...data,
      password,
      role: Role.Visitor,
    });
  }

  async createUser(data: {
    fullName: string;
    email: string;
    password: string;
    role: Role;
    phone?: string;
    staffType?: import('../common/enums/staff-type.enum.js').StaffType;
  }): Promise<User> {
    const passwordHash = await hash(data.password, 10);

    const user = this.usersRepository.create({
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      passwordHash,
      phone: data.phone,
      staffType: data.staffType,
    });

    try {
      return await this.usersRepository.save(user);
    } catch (e: unknown) {
      const err = e as { code?: string; detail?: string };
      if (err?.code === '23505') {
        throw new ConflictException(err.detail || 'User already exists');
      }
      throw e;
    }
  }

  async findAll(role?: Role): Promise<User[]> {
    return this.usersRepository.find({
      where: role ? { role } : {},
      order: { createdAt: 'DESC' },
    });
  }

  // find a user by email including password hash
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'fullName', 'role', 'passwordHash'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email }, select: ['id', 'email', 'role'] });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone }, select: ['id', 'phone', 'role'] });
  }

  async findByIdentity(target: string): Promise<{ user: User | null; isNewUser: boolean }> {
    let user = await this.usersRepository.findOne({
      where: { email: target },
      select: ['id', 'fullName', 'email', 'phone', 'role'],
    });
    if (!user) {
      user = await this.usersRepository.findOne({
        where: { phone: target },
        select: ['id', 'fullName', 'email', 'phone', 'role'],
      });
    }
    return { user, isNewUser: !user };
  }

  async updateUser(id: string, dto: UpdateUserDto, actor?: User): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only super admin can modify super admin accounts
    if (user.role === Role.SuperAdmin && actor?.role !== Role.SuperAdmin) {
      throw new ForbiddenException('Cannot modify super admin account');
    }

    const patch: Partial<User> = {};
    if (dto.fullName !== undefined) patch.fullName = dto.fullName;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.password !== undefined) patch.passwordHash = await hash(dto.password, 10);
    if (dto.staffType !== undefined) patch.staffType = dto.staffType;

    Object.assign(user, patch);

    try {
      return await this.usersRepository.save(user);
    } catch (e: unknown) {
      const err = e as { code?: string; detail?: string };
      if (err?.code === '23505') {
        throw new ConflictException(err.detail || 'User already exists');
      }
      throw e;
    }
  }

  async deleteUser(id: string): Promise<{ deleted: true }> {
    const result = await this.usersRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('User not found');
    }
    return { deleted: true };
  }

  // update last login timestamp
  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { lastLoginAt: new Date() });
  }

  // ensure a super admin exists on startup
  async onModuleInit(): Promise<void> {
    const existingSuperAdmin = await this.usersRepository.findOne({
      where: { role: Role.SuperAdmin },
    });

    if (existingSuperAdmin) {
      return;
    }

    const email =
      this.configService.get<string>('SUPERADMIN_EMAIL') || 'superadmin@example.com';
    const password =
      this.configService.get<string>('SUPERADMIN_PASSWORD') || 'ChangeMe123!';
    const fullName =
      this.configService.get<string>('SUPERADMIN_FULL_NAME') || 'Super Admin';

    const passwordHash = await hash(password, 10);

    const user = this.usersRepository.create({
      fullName,
      email,
      role: Role.SuperAdmin,
      passwordHash,
    });

    await this.usersRepository.save(user);
    this.logger.log(`Seeded super admin user with email ${email}`);
  }
}

