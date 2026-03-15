import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from './entities/registration.entity.js';
import { RegistrationFieldValue } from './entities/registration-field-value.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Registration, RegistrationFieldValue])],
})
export class RegistrationsModule {}
