import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Host } from './entities/host.entity.js';
import { HostsService } from './hosts.service.js';
import { HostsController } from './hosts.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Host])],
  controllers: [HostsController],
  providers: [HostsService],
  exports: [HostsService],
})
export class HostsModule {}
