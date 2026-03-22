import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig, databaseConfig, jwtConfig, validate } from './config/index.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CustomFieldsModule } from './custom-fields/custom-fields.module.js';
import { NdaTemplatesModule } from './nda-templates/nda-templates.module.js';
import { BadgeTemplatesModule } from './badge-templates/badge-templates.module.js';
import { QrTemplatesModule } from './qr-templates/qr-templates.module.js';
import { RegistrationsModule } from './registrations/registrations.module.js';
import { OtpVerificationsModule } from './otp-verifications/otp-verifications.module.js';
import { RegistrationActivityLogsModule } from './registration-activity-logs/registration-activity-logs.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validate,
      expandVariables: true,
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: configService.get<boolean>('database.synchronize'),
        logging: configService.get<boolean>('database.logging'),
        migrations: [join(__dirname, 'database', 'migrations', '*.js')],
        migrationsRun: true,
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
    UsersModule,
    AuthModule,
    CustomFieldsModule,
    NdaTemplatesModule,
    BadgeTemplatesModule,
    QrTemplatesModule,
    RegistrationsModule,
    OtpVerificationsModule,
    RegistrationActivityLogsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
