import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from './entities/registration.entity.js';
import { RegistrationFieldValue } from './entities/registration-field-value.entity.js';
import { CustomFieldsService } from '../custom-fields/custom-fields.service.js';
import { UsersService } from '../users/users.service.js';
import { Role } from '../common/enums/role.enum.js';
import { RegistrationStatus } from '../common/enums/registration-status.enum.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { UpdateRegistrationDto } from './dto/update-registration.dto.js';
import { ApproveRegistrationDto } from './dto/approve-registration.dto.js';
import { RejectRegistrationDto } from './dto/reject-registration.dto.js';

const USER_FIELD_KEYS = {
  email: ['email', 'visitor_email', 'user_email'],
  fullName: ['full_name', 'fullName', 'name', 'visitor_name', 'visitor_full_name'],
  phone: ['phone', 'visitor_phone', 'user_phone'],
};

function extract(fv: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = fv?.[key];
    if (v != null && typeof v === 'string') return v.trim() || undefined;
    if (v != null && typeof v === 'number') return String(v);
  }
  return undefined;
}

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    @InjectRepository(RegistrationFieldValue)
    private readonly fieldValueRepo: Repository<RegistrationFieldValue>,
    private readonly customFieldsService: CustomFieldsService,
    private readonly usersService: UsersService,
  ) {}

  async getFormFields() {
    return this.customFieldsService.findActiveForForm();
  }

  async create(dto: CreateRegistrationDto) {
    let userId = dto.userId;

    if (!userId) {
      const fv = dto.fieldValues ?? {};
      const email = extract(fv, USER_FIELD_KEYS.email);
      const fullName = extract(fv, USER_FIELD_KEYS.fullName);
      const phone = extract(fv, USER_FIELD_KEYS.phone);

      if (!email) {
        throw new BadRequestException('Email is required in fieldValues when userId is not provided');
      }
      if (!fullName) {
        throw new BadRequestException('Full name is required in fieldValues when userId is not provided');
      }

      let user = await this.usersService.findByEmail(email);
      if (!user) {
        user = await this.usersService.createVisitor({
          fullName,
          email,
          phone,
        });
      } else if (user.role !== Role.Visitor) {
        throw new ConflictException('Email is already registered with a different account type');
      }
      userId = user.id;
    }

    const registration = this.registrationRepo.create({
      userId,
      ndaAcceptanceId: dto.ndaAcceptanceId,
      badgeTemplateId: dto.badgeTemplateId,
      qrTemplateId: dto.qrTemplateId,
      requestedDate: dto.requestedDate,
      requestedTimeFrom: dto.requestedTimeFrom,
      requestedTimeTo: dto.requestedTimeTo,
      purposeOfVisit: dto.purposeOfVisit,
      status: RegistrationStatus.Pending,
      createdById: userId,
    });

    try {
      const saved = await this.registrationRepo.save(registration);
      const fv = dto.fieldValues ?? {};
      if (Object.keys(fv).length > 0) {
        await this.saveFieldValues(saved.id, fv, userId, userId);
      }
      return this.findOne(saved.id);
    } catch (e: unknown) {
      const err = e as { code?: string; detail?: string };
      if (err?.code === '23505') {
        throw new ConflictException(err.detail || 'Registration conflict');
      }
      throw e;
    }
  }

  private async upsertFieldValues(
    registrationId: string,
    fieldValues: Record<string, unknown>,
    updatedById?: string,
  ) {
    const customFields = await this.customFieldsService.findAll();
    const fieldKeyToId = new Map(customFields.map((f) => [f.fieldKey, f.id]));

    const existing = await this.fieldValueRepo.find({
      where: { registrationId },
      relations: ['customField'],
    });
    const existingByCustomFieldId = new Map(existing.map((e) => [e.customFieldId, e]));

    for (const [fieldKey, value] of Object.entries(fieldValues)) {
      const customFieldId = fieldKeyToId.get(fieldKey);
      if (!customFieldId) continue;

      const existingRow = existingByCustomFieldId.get(customFieldId);
      if (existingRow) {
        existingRow.value = value;
        if (updatedById !== undefined) existingRow.updatedById = updatedById;
        await this.fieldValueRepo.save(existingRow);
      } else {
        const entity = this.fieldValueRepo.create({
          registrationId,
          customFieldId,
          value,
          createdById: updatedById,
          updatedById,
        });
        await this.fieldValueRepo.save(entity);
      }
    }
  }

  private async saveFieldValues(
    registrationId: string,
    fieldValues: Record<string, unknown>,
    createdById?: string,
    updatedById?: string,
  ) {
    const customFields = await this.customFieldsService.findAll();
    const fieldKeyToId = new Map(customFields.map((f) => [f.fieldKey, f.id]));

    const toSave: Array<{
      registrationId: string;
      customFieldId: string;
      value: unknown;
      createdById?: string;
      updatedById?: string;
    }> = [];
    for (const [fieldKey, value] of Object.entries(fieldValues)) {
      const customFieldId = fieldKeyToId.get(fieldKey);
      if (customFieldId) {
        toSave.push({ registrationId, customFieldId, value, createdById, updatedById });
      }
    }

    if (toSave.length === 0) return;

    const entities = toSave.map((item) =>
      this.fieldValueRepo.create({
        registrationId: item.registrationId,
        customFieldId: item.customFieldId,
        value: item.value,
        createdById: item.createdById,
        updatedById: item.updatedById,
      }),
    );
    await this.fieldValueRepo.save(entities);
  }

  async findAll(status?: RegistrationStatus) {
    const where = status ? { status } : {};
    return this.registrationRepo.find({
      where,
      relations: ['user', 'fieldValues', 'fieldValues.customField'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const reg = await this.registrationRepo.findOne({
      where: { id },
      relations: ['user', 'fieldValues', 'fieldValues.customField'],
    });
    if (!reg) {
      throw new NotFoundException('Registration not found');
    }
    return reg;
  }

  async update(id: string, dto: UpdateRegistrationDto, actorUserId?: string) {
    const reg = await this.registrationRepo.findOne({ where: { id } });
    if (!reg) {
      throw new NotFoundException('Registration not found');
    }

    const patch: Partial<Registration> = {};
    if (dto.ndaAcceptanceId !== undefined) patch.ndaAcceptanceId = dto.ndaAcceptanceId;
    if (dto.badgeTemplateId !== undefined) patch.badgeTemplateId = dto.badgeTemplateId;
    if (dto.qrTemplateId !== undefined) patch.qrTemplateId = dto.qrTemplateId;
    if (dto.requestedDate !== undefined) patch.requestedDate = dto.requestedDate;
    if (dto.requestedTimeFrom !== undefined) patch.requestedTimeFrom = dto.requestedTimeFrom;
    if (dto.requestedTimeTo !== undefined) patch.requestedTimeTo = dto.requestedTimeTo;
    if (dto.purposeOfVisit !== undefined) patch.purposeOfVisit = dto.purposeOfVisit;
    if (dto.status !== undefined) patch.status = dto.status;
    if (actorUserId !== undefined) patch.updatedById = actorUserId;

    Object.assign(reg, patch);
    await this.registrationRepo.save(reg);

    if (dto.fieldValues !== undefined && Object.keys(dto.fieldValues).length > 0) {
      await this.upsertFieldValues(id, dto.fieldValues, actorUserId);
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const result = await this.registrationRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Registration not found');
    }
    return { deleted: true };
  }

  async approve(id: string, dto: ApproveRegistrationDto, actorUserId: string) {
    const reg = await this.registrationRepo.findOne({ where: { id } });
    if (!reg) {
      throw new NotFoundException('Registration not found');
    }

    reg.status = RegistrationStatus.Approved;
    reg.approvedByUserId = actorUserId;
    reg.approvedAt = new Date();
    reg.approvedDate = dto.approvedDate ?? reg.requestedDate;
    reg.approvedTimeFrom = dto.approvedTimeFrom ?? reg.requestedTimeFrom;
    reg.approvedTimeTo = dto.approvedTimeTo ?? reg.requestedTimeTo;
    reg.rejectionReason = null;
    reg.updatedById = actorUserId;

    await this.registrationRepo.save(reg);
    return this.findOne(id);
  }

  async reject(id: string, dto: RejectRegistrationDto, actorUserId: string) {
    const reg = await this.registrationRepo.findOne({ where: { id } });
    if (!reg) {
      throw new NotFoundException('Registration not found');
    }

    reg.status = RegistrationStatus.Rejected;
    reg.rejectionReason = dto.rejectionReason;
    reg.approvedByUserId = actorUserId;
    reg.approvedAt = new Date();
    reg.updatedById = actorUserId;

    await this.registrationRepo.save(reg);
    return this.findOne(id);
  }

  async cancel(id: string, actorUserId?: string) {
    const reg = await this.registrationRepo.findOne({ where: { id } });
    if (!reg) {
      throw new NotFoundException('Registration not found');
    }

    reg.status = RegistrationStatus.Cancelled;
    if (actorUserId) reg.updatedById = actorUserId;
    await this.registrationRepo.save(reg);
    return this.findOne(id);
  }
}
