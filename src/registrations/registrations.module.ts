import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from './entities/registration.entity.js';
import { RegistrationFieldValue } from './entities/registration-field-value.entity.js';
import { RegistrationsController } from './registrations.controller.js';
import { RegistrationsService } from './registrations.service.js';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module.js';
import { UsersModule } from '../users/users.module.js';
import { HostsModule } from '../hosts/hosts.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Registration, RegistrationFieldValue]),
    CustomFieldsModule,
    UsersModule,
    HostsModule,
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
