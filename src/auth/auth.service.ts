import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
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

  // issue access and refresh tokens for a user
  async login(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, role: user.role, email: user.email };

    const refreshSecret = this.configService.get<string>(
      'jwt.refreshSecret',
      'dev-refresh-secret-change-in-production',
    );
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: refreshExpiresIn as StringValue }),
    ]);

    await this.usersService.updateLastLogin(user.id);

    return { accessToken, refreshToken };
  }

  // rotate tokens 
  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshSecret = this.configService.get<string>(
      'jwt.refreshSecret',
      'dev-refresh-secret-change-in-production',
    );

    let payload: { sub: string; role: string; email: string };
    try {
      payload = await this.jwtService.verifyAsync(token, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newPayload = { sub: user.id, role: user.role, email: user.email };
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(newPayload),
      this.jwtService.signAsync(newPayload, { secret: refreshSecret, expiresIn: refreshExpiresIn as StringValue }),
    ]);

    return { accessToken, refreshToken };
  }
}

