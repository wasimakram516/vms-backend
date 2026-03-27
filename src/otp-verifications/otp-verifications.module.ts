import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpVerification } from './entities/otp-verification.entity.js';
import { OtpVerificationsService } from './otp-verifications.service.js';
import { UsersModule } from '../users/users.module.js';
import { HostsModule } from '../hosts/hosts.module.js';
import { Registration } from '../registrations/entities/registration.entity.js';
import { RegistrationFieldValue } from '../registrations/entities/registration-field-value.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([OtpVerification, Registration, RegistrationFieldValue]), UsersModule, HostsModule],
  providers: [OtpVerificationsService],
  exports: [OtpVerificationsService],
})
export class OtpVerificationsModule {}
