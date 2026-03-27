import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { NdaTemplate } from './entities/nda-template.entity.js';
import { UserNdaAcceptance } from './entities/user-nda-acceptance.entity.js';
import { CreateNdaTemplateDto } from './dto/nda-section.dto.js';
import { UpdateNdaTemplateDto } from './dto/update-nda-template.dto.js';

@Injectable()
export class NdaTemplatesService {
  constructor(
    @InjectRepository(NdaTemplate)
    private readonly repo: Repository<NdaTemplate>,
    @InjectRepository(UserNdaAcceptance)
    private readonly acceptanceRepo: Repository<UserNdaAcceptance>,
  ) {}

  async create(dto: CreateNdaTemplateDto, actorUserId?: string): Promise<NdaTemplate> {
    const template = this.repo.create({
      ...dto,
      version: 1,
      isActive: false,
      createdById: actorUserId,
      updatedById: actorUserId,
    });
    return this.repo.save(template);
  }

  async findAll(): Promise<NdaTemplate[]> {
    return this.repo.find({ order: { version: 'DESC', createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<NdaTemplate> {
    const template = await this.repo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('NDA template not found');
    return template;
  }

  async findActive(): Promise<NdaTemplate | null> {
    return this.repo.findOne({ where: { isActive: true } });
  }

  async update(id: string, dto: UpdateNdaTemplateDto, actorUserId?: string): Promise<NdaTemplate> {
    const template = await this.findOne(id);
    Object.assign(template, dto, {
      version: template.version + 1,
      updatedById: actorUserId,
    });
    return this.repo.save(template);
  }

  async deactivate(id: string, actorUserId?: string): Promise<NdaTemplate> {
    const template = await this.findOne(id);
    template.isActive = false;
    if (actorUserId) template.updatedById = actorUserId;
    return this.repo.save(template);
  }

  async activate(id: string, actorUserId?: string): Promise<NdaTemplate> {
    const template = await this.findOne(id);

    // deactivate all others first
    await this.repo.update({ isActive: true }, { isActive: false });

    template.isActive = true;
    if (actorUserId) template.updatedById = actorUserId;
    return this.repo.save(template);
  }

  async findAllForms(): Promise<UserNdaAcceptance[]> {
    return this.acceptanceRepo.find({
      where: { ndaFormUrl: Not(IsNull()) },
      relations: ['user', 'ndaTemplate'],
      order: { acceptedAt: 'DESC' },
    });
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const template = await this.findOne(id);
    if (template.isActive) {
      throw new BadRequestException('Cannot delete the active NDA template. Deactivate it first.');
    }
    await this.repo.delete(id);
    return { deleted: true };
  }
}
