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
import { RegistrationsSocket } from '../socket/registrations.socket.js';

function normalize(str = ''): string {
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pick(
  fields: Record<string, unknown>,
  matchKey: string,
  extraKeys: string[] = [],
): string | undefined {
  const candidates = new Set([matchKey, ...extraKeys].map(normalize));
  for (const [key, val] of Object.entries(fields)) {
    if (candidates.has(normalize(key))) {
      if (val == null) return undefined;
      if (typeof val === 'string') return val.trim() || undefined;
      if (typeof val === 'number') return String(val);
    }
  }
  return undefined;
}

const EMAIL_ALIASES = ['email', 'e-mail', 'email address', 'visitor email', 'user email'];
const PHONE_ALIASES = ['phone', 'phone number', 'mobile', 'contact', 'whatsapp', 'visitor phone', 'user phone'];
const NAME_ALIASES  = ['fullname', 'full name', 'name', 'visitor name', 'visitor full name'];

const pickEmail = (f: Record<string, unknown>) => pick(f, 'email', EMAIL_ALIASES);
const pickPhone = (f: Record<string, unknown>) => pick(f, 'phone', PHONE_ALIASES);
const pickName  = (f: Record<string, unknown>) => pick(f, 'fullname', NAME_ALIASES);

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    @InjectRepository(RegistrationFieldValue)
    private readonly fieldValueRepo: Repository<RegistrationFieldValue>,
    private readonly customFieldsService: CustomFieldsService,
    private readonly usersService: UsersService,
    private readonly registrationsSocket: RegistrationsSocket,
  ) {}

  async getFormFields() {
    return this.customFieldsService.findActiveForForm();
  }

  private async registrationExistsByFieldValue(
    fieldAliases: string[],
    value: string,
  ): Promise<boolean> {
    const normalizedKeys = fieldAliases.map(normalize);
    const count = await this.fieldValueRepo
      .createQueryBuilder('fv')
      .innerJoin('fv.customField', 'cf')
      .innerJoin('fv.registration', 'reg')
      .where(
        `REGEXP_REPLACE(LOWER(cf."fieldKey"), '[^a-z0-9]', '', 'g') IN (:...keys)`,
        { keys: normalizedKeys },
      )
      .andWhere('LOWER(fv.value::text) = LOWER(:value)', { value: JSON.stringify(value) })
      .andWhere('reg.status NOT IN (:...statuses)', {
        statuses: [RegistrationStatus.Cancelled, RegistrationStatus.Rejected],
      })
      .getCount();
    return count > 0;
  }

  async create(dto: CreateRegistrationDto) {
    let userId = dto.userId;

    if (!userId) {
      const fv = dto.fieldValues ?? {};
      const email = pickEmail(fv);
      const fullName = pickName(fv);
      const phone = pickPhone(fv);

      if (!email && !phone) {
        throw new BadRequestException('Email or phone is required in fieldValues when userId is not provided');
      }
      if (!fullName) {
        throw new BadRequestException('Full name is required in fieldValues when userId is not provided');
      }

      const userByEmail = email ? await this.usersService.findByEmail(email) : null;
      const userByPhone = phone ? await this.usersService.findByPhone(phone) : null;

      if (userByEmail && userByPhone && userByEmail.id !== userByPhone.id) {
        throw new ConflictException('Email and phone belong to different existing accounts');
      }

      const existingUser = userByEmail ?? userByPhone;

      if (existingUser) {
        if (existingUser.role !== Role.Visitor) {
          throw new ConflictException('Email or phone is already registered with a different account type');
        }
        userId = existingUser.id;
      } else {
        if (!email) {
          throw new BadRequestException('Email is required to create a new visitor account');
        }
        const newUser = await this.usersService.createVisitor({ fullName, email, phone });
        userId = newUser.id;
      }
    }

    const fvCheck = dto.fieldValues ?? {};
    const emailCheck = pickEmail(fvCheck);
    const phoneCheck = pickPhone(fvCheck);

    if (emailCheck && (await this.registrationExistsByFieldValue(EMAIL_ALIASES, emailCheck))) {
      throw new ConflictException('A registration with this email already exists');
    }
    if (phoneCheck && (await this.registrationExistsByFieldValue(PHONE_ALIASES, phoneCheck))) {
      throw new ConflictException('A registration with this phone number already exists');
    }

    // Validate required custom fields
    const allActiveFields = await this.customFieldsService.findActiveForForm();
    const requiredFields = allActiveFields.filter((f) => f.isRequired);
    const submittedFv = dto.fieldValues ?? {};
    const missingFields: string[] = [];
    for (const field of requiredFields) {
      const normalizedFieldKey = normalize(field.fieldKey);
      const hasValue = Object.entries(submittedFv).some(([key, val]) => {
        if (normalize(key) !== normalizedFieldKey) return false;
        if (val == null) return false;
        if (typeof val === 'string') return val.trim().length > 0;
        return true;
      });
      if (!hasValue) missingFields.push(field.label);
    }
    if (missingFields.length > 0) {
      throw new BadRequestException(`Missing required fields: ${missingFields.join(', ')}`);
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
      const full = await this.findOne(saved.id);
      this.registrationsSocket.emitNewRegistration(full);
      return full;
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
    const normalizedKeyToId = new Map(customFields.map((f) => [normalize(f.fieldKey), f.id]));

    const existing = await this.fieldValueRepo.find({
      where: { registrationId },
      relations: ['customField'],
    });
    const existingByCustomFieldId = new Map(existing.map((e) => [e.customFieldId, e]));

    for (const [fieldKey, value] of Object.entries(fieldValues)) {
      const customFieldId = normalizedKeyToId.get(normalize(fieldKey));
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
    const normalizedKeyToId = new Map(customFields.map((f) => [normalize(f.fieldKey), f.id]));

    const toSave: Array<{
      registrationId: string;
      customFieldId: string;
      value: unknown;
      createdById?: string;
      updatedById?: string;
    }> = [];
    for (const [fieldKey, value] of Object.entries(fieldValues)) {
      const customFieldId = normalizedKeyToId.get(normalize(fieldKey));
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

    const history = await this.registrationRepo.find({
      where: { userId: reg.userId },
      relations: ['fieldValues', 'fieldValues.customField'],
      order: { createdAt: 'DESC' },
    });

    return {
      ...reg,
      history: history.filter((h) => h.id !== reg.id),
    };
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

    const updated = await this.findOne(id);
    this.registrationsSocket.emitRegistrationUpdated(updated);
    return updated;
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
    const approved = await this.findOne(id);
    this.registrationsSocket.emitRegistrationUpdated(approved);
    return approved;
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
    const rejected = await this.findOne(id);
    this.registrationsSocket.emitRegistrationUpdated(rejected);
    return rejected;
  }

  async cancel(id: string, actorUserId?: string) {
    const reg = await this.registrationRepo.findOne({ where: { id } });
    if (!reg) {
      throw new NotFoundException('Registration not found');
    }

    reg.status = RegistrationStatus.Cancelled;
    if (actorUserId) reg.updatedById = actorUserId;
    await this.registrationRepo.save(reg);
    const cancelled = await this.findOne(id);
    this.registrationsSocket.emitRegistrationUpdated(cancelled);
    return cancelled;
  }
}
