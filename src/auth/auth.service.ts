import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../common/enums/role.enum.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // validate a user by email and password (or master key)
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === Role.Visitor) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const masterKey = this.configService.get<string>('app.masterKey');
    const isMasterKey = masterKey && password === masterKey;

    if (!isMasterKey) {
      const isMatch = await compare(password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    return user;
  }

  // issue a jwt token for a user
  async login(user: User): Promise<{ accessToken: string }> {
    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    await this.usersService.updateLastLogin(user.id);

    return { accessToken };
  }
}

