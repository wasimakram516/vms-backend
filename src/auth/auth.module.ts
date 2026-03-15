import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret', 'dev-secret-change-in-production'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn', '7d') as StringValue,
        },
      }),
    }),
  ],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
