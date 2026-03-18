import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomField } from './entities/custom-field.entity.js';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto.js';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto.js';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CustomField)
    private readonly customFieldsRepository: Repository<CustomField>,
  ) {}

  async create(dto: CreateCustomFieldDto, actorUserId?: string) {
    const field = this.customFieldsRepository.create({
      ...dto,
      createdById: actorUserId,
      updatedById: actorUserId,
    });

    try {
      return await this.customFieldsRepository.save(field);
    } catch (e: unknown) {
      const err = e as { code?: string; detail?: string };
      if (err?.code === '23505') {
        throw new ConflictException(err.detail || 'Custom field already exists');
      }
      throw e;
    }
  }

  async findAll() {
    return this.customFieldsRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findActiveForForm() {
    return this.customFieldsRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      select: ['id', 'fieldKey', 'label', 'inputType', 'isRequired', 'sortOrder', 'optionsJson'],
    });
  }

  async update(id: string, dto: UpdateCustomFieldDto, actorUserId?: string) {
    const field = await this.customFieldsRepository.findOne({ where: { id } });
    if (!field) {
      throw new NotFoundException('Custom field not found');
    }

    Object.assign(field, dto, { updatedById: actorUserId });

    try {
      return await this.customFieldsRepository.save(field);
    } catch (e: unknown) {
      const err = e as { code?: string; detail?: string };
      if (err?.code === '23505') {
        throw new ConflictException(err.detail || 'Custom field already exists');
      }
      throw e;
    }
  }

  async remove(id: string) {
    const result = await this.customFieldsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Custom field not found');
    }
    return { deleted: true };
  }
}

