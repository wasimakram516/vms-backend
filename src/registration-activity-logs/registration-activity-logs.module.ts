import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationActivityLog } from './entities/registration-activity-log.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([RegistrationActivityLog])],
})
export class RegistrationActivityLogsModule {}
