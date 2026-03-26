import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Host } from './entities/host.entity.js';
import { CreateHostDto } from './dto/create-host.dto.js';
import { UpdateHostDto } from './dto/update-host.dto.js';

@Injectable()
export class HostsService {
  constructor(
    @InjectRepository(Host)
    private readonly hostsRepo: Repository<Host>,
  ) {}

  async create(dto: CreateHostDto, actorUserId?: string): Promise<Host> {
    const count = await this.hostsRepo.count();
    if (count > 0) {
      throw new BadRequestException('Only one host profile is allowed. Use update instead.');
    }

    const host = this.hostsRepo.create({ ...dto, createdById: actorUserId, updatedById: actorUserId });
    return this.hostsRepo.save(host);
  }

  async get(): Promise<Host> {
    const host = await this.hostsRepo.findOne({ where: {} });
    if (!host) {
      throw new NotFoundException('No host profile configured');
    }
    return host;
  }

  async update(dto: UpdateHostDto, actorUserId?: string): Promise<Host> {
    const host = await this.hostsRepo.findOne({ where: {} });
    if (!host) {
      throw new NotFoundException('No host profile configured');
    }

    Object.assign(host, dto, { updatedById: actorUserId });
    return this.hostsRepo.save(host);
  }

  async remove(): Promise<{ deleted: true }> {
    const host = await this.hostsRepo.findOne({ where: {} });
    if (!host) {
      throw new NotFoundException('No host profile configured');
    }
    await this.hostsRepo.delete(host.id);
    return { deleted: true };
  }
}
