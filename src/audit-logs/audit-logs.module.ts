import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
})
export class AuditLogsModule {}
