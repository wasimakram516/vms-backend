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
import { MailService } from '../mail/mail.service.js';
import { buildRegistrationStatusEmail } from '../mail/templates/approval.template.js';
import {
  buildHostNewRegistrationEmail,
  buildHostApprovedEmail,
  buildHostRejectedEmail,
  buildHostCancelledEmail,
  buildHostCheckInEmail,
  buildHostCheckOutEmail,
} from '../mail/templates/host-notification.template.js';
import { generateNdaPdf } from '../mail/templates/nda.pdf.js';
import { HostsService } from '../hosts/hosts.service.js';
import { NdaTemplatesService } from '../nda-templates/nda-templates.service.js';
import { UserNdaAcceptance } from '../nda-templates/entities/user-nda-acceptance.entity.js';
import { uploadBufferToS3 } from '../common/s3.storage.js';
import { nanoid } from 'nanoid';
import * as QRCode from 'qrcode';

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

const EMAIL_ALIASES        = ['email', 'e-mail', 'email address', 'visitor email', 'user email'];
const PHONE_ALIASES        = ['phone', 'phone number', 'mobile', 'contact', 'whatsapp', 'visitor phone', 'user phone'];
const NAME_ALIASES         = ['fullname', 'full name', 'name', 'visitor name', 'visitor full name'];
const ORGANISATION_ALIASES = ['organisation', 'organization', 'company', 'company name', 'organisation name', 'organization name', 'employer', 'firm'];
const ID_ALIASES           = ['civilid', 'civil id', 'national id', 'nationalid', 'id number', 'idnumber', 'passport', 'passport number', 'passportno', 'id card', 'identity number', 'eid'];

const pickEmail        = (f: Record<string, unknown>) => pick(f, 'email', EMAIL_ALIASES);
const pickPhone        = (f: Record<string, unknown>) => pick(f, 'phone', PHONE_ALIASES);
const pickName         = (f: Record<string, unknown>) => pick(f, 'fullname', NAME_ALIASES);
const pickOrganisation = (f: Record<string, unknown>) => pick(f, 'organisation', ORGANISATION_ALIASES);
const pickId           = (f: Record<string, unknown>) => pick(f, 'civilid', ID_ALIASES);

function formatNdaDate(dateStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

function formatNdaTime(timeStr: string): string {
  const [hourStr, minuteStr] = timeStr.split(':');
  let hour = parseInt(hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minuteStr} ${ampm}`;
}

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    @InjectRepository(RegistrationFieldValue)
    private readonly fieldValueRepo: Repository<RegistrationFieldValue>,
    @InjectRepository(UserNdaAcceptance)
    private readonly ndaAcceptanceRepo: Repository<UserNdaAcceptance>,
    private readonly customFieldsService: CustomFieldsService,
    private readonly usersService: UsersService,
    private readonly registrationsSocket: RegistrationsSocket,
    private readonly mailService: MailService,
    private readonly hostsService: HostsService,
    private readonly ndaTemplatesService: NdaTemplatesService,
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

  private async getHostSafe() {
    try {
      return await this.hostsService.get();
    } catch {
      return null;
    }
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

    if (!dto.userId) {
      const fvCheck = dto.fieldValues ?? {};
      const emailCheck = pickEmail(fvCheck);
      const phoneCheck = pickPhone(fvCheck);

      if (emailCheck && (await this.registrationExistsByFieldValue(EMAIL_ALIASES, emailCheck))) {
        throw new ConflictException('A registration with this email already exists');
      }
      if (phoneCheck && (await this.registrationExistsByFieldValue(PHONE_ALIASES, phoneCheck))) {
        throw new ConflictException('A registration with this phone number already exists');
      }
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

    // Create NDA acceptance record inline if visitor accepted
    let ndaAcceptanceId: string | undefined;
    if (dto.ndaAccepted) {
      const activeTemplate = await this.ndaTemplatesService.findActive();
      if (activeTemplate) {
        const acceptance = this.ndaAcceptanceRepo.create({
          userId,
          ndaTemplateId: activeTemplate.id,
          acceptedAt: new Date(),
          createdById: userId,
          updatedById: userId,
        });
        const saved = await this.ndaAcceptanceRepo.save(acceptance);
        ndaAcceptanceId = saved.id;
      }
    }

    const registration = this.registrationRepo.create({
      userId,
      ndaAcceptanceId,
      badgeTemplateId: dto.badgeTemplateId,
      qrTemplateId: dto.qrTemplateId,
      requestedDateFrom: dto.requestedDateFrom,
      requestedDateTo: dto.requestedDateTo,
      requestedTimeFrom: dto.requestedTimeFrom,
      requestedTimeTo: dto.requestedTimeTo,
      purposeOfVisit: dto.purposeOfVisit,
      status: RegistrationStatus.Pending,
      qrToken: nanoid(10),
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
      this.sendHostNewRegistrationEmail(full).catch(() => {});
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
    if (dto.requestedDateFrom !== undefined) patch.requestedDateFrom = dto.requestedDateFrom;
    if (dto.requestedDateTo !== undefined) patch.requestedDateTo = dto.requestedDateTo;
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
    reg.approvedDateFrom = dto.approvedDateFrom ?? reg.requestedDateFrom;
    reg.approvedDateTo = dto.approvedDateTo ?? reg.requestedDateTo;
    reg.approvedTimeFrom = dto.approvedTimeFrom ?? reg.requestedTimeFrom;
    reg.approvedTimeTo = dto.approvedTimeTo ?? reg.requestedTimeTo;
    reg.approvedTimezone = dto.approvedTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    reg.rejectionReason = null;
    reg.updatedById = actorUserId;

    await this.registrationRepo.save(reg);
    const approved = await this.findOne(id);
    this.registrationsSocket.emitRegistrationUpdated(approved);
    await this.sendStatusEmail(approved, reg, 'approved');
    this.sendHostStatusEmail(approved, reg, 'approved').catch(() => {});
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
    await this.sendStatusEmail(rejected, reg, 'rejected');
    this.sendHostStatusEmail(rejected, reg, 'rejected').catch(() => {});
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
    await this.sendStatusEmail(cancelled, reg, 'cancelled');
    this.sendHostStatusEmail(cancelled, reg, 'cancelled').catch(() => {});
    return cancelled;
  }

  private async sendStatusEmail(
    result: Awaited<ReturnType<typeof this.findOne>>,
    reg: Registration,
    status: 'approved' | 'rejected' | 'cancelled',
  ): Promise<void> {
    const visitorEmail = result.user?.email;
    if (!visitorEmail) return;

    try {
      let qrBuffer: Buffer | undefined;
      if (status === 'approved' && reg.qrToken) {
        qrBuffer = await QRCode.toBuffer(reg.qrToken, { width: 300, margin: 2 });
      }

      const host = await this.getHostSafe();

      const subjects: Record<typeof status, string> = {
        approved: 'Your Visit Has Been Approved',
        rejected: 'Your Visit Request Has Been Rejected',
        cancelled: 'Your Visit Has Been Cancelled',
      };

      const html = buildRegistrationStatusEmail({
        status,
        visitorName: result.user.fullName ?? 'Visitor',
        hostName: host?.name,
        hostLogoUrl: host?.logoUrl,
        approvedDateFrom: reg.approvedDateFrom,
        approvedDateTo: reg.approvedDateTo,
        approvedTimeFrom: reg.approvedTimeFrom,
        approvedTimeTo: reg.approvedTimeTo,
        purposeOfVisit: reg.purposeOfVisit ?? null,
        qrToken: reg.qrToken ?? undefined,
        rejectionReason: reg.rejectionReason ?? null,
      });

      const attachments = qrBuffer
        ? [{ filename: 'qrcode.png', content: qrBuffer, cid: 'qrcode@sinan' }]
        : undefined;

      await this.mailService.sendEmail(visitorEmail, subjects[status], html, attachments);
    } catch {
      // Email failure must not block the response
    }
  }

  private async sendHostNewRegistrationEmail(
    result: Awaited<ReturnType<typeof this.findOne>>,
  ): Promise<void> {
    const host = await this.getHostSafe();
    if (!host?.email) return;

    const fields = this.extractFields(result);
    const visitor = this.buildVisitorSummary(result, fields);

    const reg = result;
    const requestedDate = reg.requestedDateFrom
      ? reg.requestedDateFrom === reg.requestedDateTo
        ? reg.requestedDateFrom
        : `${reg.requestedDateFrom} – ${reg.requestedDateTo}`
      : '—';
    const requestedTime = reg.requestedTimeFrom
      ? `${reg.requestedTimeFrom} – ${reg.requestedTimeTo}`
      : null;

    const html = buildHostNewRegistrationEmail({
      host: { name: host.name, logoUrl: host.logoUrl },
      visitor,
      requestedDate,
      requestedTime,
    });

    await this.mailService.sendEmail(
      host.email,
      `New Visit Request — ${visitor.fullName}`,
      html,
    );
  }

  private async sendHostStatusEmail(
    result: Awaited<ReturnType<typeof this.findOne>>,
    reg: Registration,
    status: 'approved' | 'rejected' | 'cancelled',
  ): Promise<void> {
    const host = await this.getHostSafe();
    if (!host?.email) return;

    const fields = this.extractFields(result);
    const visitor = this.buildVisitorSummary(result, fields);

    const dateRange = reg.approvedDateFrom
      ? reg.approvedDateFrom === reg.approvedDateTo
        ? reg.approvedDateFrom
        : `${reg.approvedDateFrom} – ${reg.approvedDateTo}`
      : null;
    const timeRange = reg.approvedTimeFrom
      ? `${reg.approvedTimeFrom} – ${reg.approvedTimeTo}`
      : null;

    let html: string;
    let subject: string;

    if (status === 'approved') {
      html = buildHostApprovedEmail({
        host: { name: host.name, logoUrl: host.logoUrl },
        visitor,
        approvedDate: dateRange ?? '—',
        approvedTime: timeRange,
      });
      subject = `Visit Approved — ${visitor.fullName}`;
    } else if (status === 'rejected') {
      html = buildHostRejectedEmail({
        host: { name: host.name, logoUrl: host.logoUrl },
        visitor,
        rejectionReason: reg.rejectionReason,
      });
      subject = `Visit Rejected — ${visitor.fullName}`;
    } else {
      html = buildHostCancelledEmail({
        host: { name: host.name, logoUrl: host.logoUrl },
        visitor,
        approvedDate: dateRange,
      });
      subject = `Visit Cancelled — ${visitor.fullName}`;
    }

    await this.mailService.sendEmail(host.email, subject, html);
  }

  private extractFields(result: Awaited<ReturnType<typeof this.findOne>>): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    for (const fv of result.fieldValues ?? []) {
      if (fv.customField?.fieldKey) {
        fields[fv.customField.fieldKey] = fv.value;
      }
    }
    return fields;
  }

  private buildVisitorSummary(
    result: Awaited<ReturnType<typeof this.findOne>>,
    fields: Record<string, unknown>,
  ) {
    return {
      fullName: result.user?.fullName ?? 'Visitor',
      organisation: pickOrganisation(fields),
      idNumber: pickId(fields),
      email: result.user?.email ?? pickEmail(fields),
      phone: result.user?.phone ?? pickPhone(fields),
      purpose: result.purposeOfVisit ?? undefined,
    };
  }

  async verifyByToken(token: string) {
    const reg = await this.registrationRepo.findOne({
      where: { qrToken: token },
      relations: ['user', 'fieldValues', 'fieldValues.customField'],
    });

    if (!reg) {
      throw new NotFoundException('Invalid QR token');
    }

    const isAccessible =
      reg.status === RegistrationStatus.Approved ||
      reg.status === RegistrationStatus.CheckedIn ||
      reg.status === RegistrationStatus.CheckedOut;

    if (!isAccessible) {
      return {
        id: reg.id,
        status: reg.status,
        notApproved: true,
        visitor: {
          fullName: reg.user?.fullName ?? null,
          companyName: reg.user?.companyName ?? null,
          purposeOfVisit: reg.purposeOfVisit ?? null,
        },
      };
    }

    const history = await this.registrationRepo.find({
      where: { userId: reg.userId },
      relations: ['fieldValues', 'fieldValues.customField'],
      order: { createdAt: 'DESC' },
    });

    return {
      ...reg,
      notApproved: false,
      history: history.filter((h) => h.id !== reg.id),
    };
  }

  async checkIn(id: string, actorUserId: string) {
    const reg = await this.registrationRepo.findOne({ where: { id } });
    if (!reg) {
      throw new NotFoundException('Registration not found');
    }

    if (reg.status !== RegistrationStatus.Approved) {
      throw new BadRequestException('Registration must be approved before check-in');
    }

    const now = new Date();
    const tz = reg.approvedTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(now).map((p) => [p.type, p.value]),
    );
    const todayStr = `${parts.year}-${parts.month}-${parts.day}`;
    const currentTimeStr = `${parts.hour}:${parts.minute}:${parts.second}`;

    const nowDatetime   = `${todayStr}T${currentTimeStr}`;
    const windowStart   = `${reg.approvedDateFrom}T${reg.approvedTimeFrom}`;
    const windowEnd     = `${reg.approvedDateTo}T${reg.approvedTimeTo}`;
    const inRange       = nowDatetime >= windowStart && nowDatetime <= windowEnd;

    if (!inRange) {
      throw new BadRequestException(
        `Check-in is not permitted at this time. The visitor's approved window is ${reg.approvedDateFrom} ${reg.approvedTimeFrom} to ${reg.approvedDateTo} ${reg.approvedTimeTo}.`,
      );
    }

    reg.status = RegistrationStatus.CheckedIn;
    reg.checkedInAt = now;
    reg.updatedById = actorUserId;

    await this.registrationRepo.save(reg);
    const updated = await this.findOne(id);
    this.registrationsSocket.emitRegistrationUpdated(updated);
    this.sendNdaToHost(updated).catch(() => {});
    return updated;
  }

  private async sendNdaToHost(reg: Awaited<ReturnType<typeof this.findOne>>): Promise<void> {
    try {
      const host = await this.hostsService.get();
      if (!host.email) return;

      const regFields = this.extractFields(reg);
      const visitorName = reg.user?.fullName ?? 'Visitor';

      const dateFrom = reg.approvedDateFrom ?? '';
      const dateTo   = reg.approvedDateTo ?? '';
      const dateOfVisit = dateFrom
        ? (dateFrom === dateTo
            ? formatNdaDate(dateFrom)
            : `${formatNdaDate(dateFrom)} – ${formatNdaDate(dateTo)}`)
        : '—';

      const timeFrom = reg.approvedTimeFrom ?? '';
      const timeTo   = reg.approvedTimeTo ?? '';
      const visitTime = timeFrom
        ? `${formatNdaTime(timeFrom)} – ${formatNdaTime(timeTo)}`
        : '—';

      const ndaTemplate = await this.ndaTemplatesService.findActive();

      const pdfBuffer = await generateNdaPdf({
        heading: ndaTemplate?.name ?? 'Non-Disclosure Agreement',
        hostName: host.name,
        visitorFullName: visitorName,
        visitorOrganisation: pickOrganisation(regFields) ?? '—',
        visitorIdNumber: pickId(regFields) ?? '—',
        dateOfVisit,
        visitTime,
        purpose: reg.purposeOfVisit ?? '—',
        preamble: ndaTemplate?.preamble ?? '',
        body: ndaTemplate?.body ?? '',
        visitorRecordTitle: ndaTemplate?.visitorRecordTitle ?? undefined,
        visitorRecordNote: ndaTemplate?.visitorRecordNote ?? undefined,
        footer: ndaTemplate?.footer ?? undefined,
      });

      const filename = `NDA_${visitorName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      // Upload PDF to S3 and store URL on the acceptance record
      try {
        const { fileUrl } = await uploadBufferToS3(pdfBuffer, 'application/pdf', filename, { inline: false });
        if (reg.ndaAcceptanceId) {
          await this.ndaAcceptanceRepo.update(reg.ndaAcceptanceId, { ndaFormUrl: fileUrl });
        }
      } catch {
        // S3 upload failure must not block email
      }

      const visitor = this.buildVisitorSummary(reg, regFields);
      const checkInAt = reg.checkedInAt
        ? reg.checkedInAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
        : new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

      const html = buildHostCheckInEmail({
        host: { name: host.name, logoUrl: host.logoUrl },
        visitor,
        checkInTime: checkInAt,
        approvedDate: dateOfVisit,
        approvedTime: visitTime !== '—' ? visitTime : null,
        ndaFilename: filename,
      });

      await this.mailService.sendEmail(
        host.email,
        `Visitor Check-In — ${visitorName}`,
        html,
        [{ filename, content: pdfBuffer, cid: 'nda@sinan' }],
      );
    } catch {
      // NDA email failure must not block check-in
    }
  }

  async checkOut(id: string, actorUserId: string) {
    const reg = await this.registrationRepo.findOne({ where: { id } });
    if (!reg) {
      throw new NotFoundException('Registration not found');
    }

    if (reg.status !== RegistrationStatus.CheckedIn) {
      throw new BadRequestException('Visitor must be checked in before checking out');
    }

    reg.status = RegistrationStatus.CheckedOut;
    reg.checkedOutAt = new Date();
    reg.updatedById = actorUserId;

    await this.registrationRepo.save(reg);
    const updated = await this.findOne(id);
    this.registrationsSocket.emitRegistrationUpdated(updated);
    this.sendHostCheckOutEmail(updated, reg).catch(() => {});
    return updated;
  }

  private async sendHostCheckOutEmail(
    result: Awaited<ReturnType<typeof this.findOne>>,
    reg: Registration,
  ): Promise<void> {
    const host = await this.getHostSafe();
    if (!host?.email) return;

    const fields = this.extractFields(result);
    const visitor = this.buildVisitorSummary(result, fields);

    const fmt = (d: Date | null | undefined) =>
      d ? d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : null;

    const checkInAt  = fmt(reg.checkedInAt);
    const checkOutAt = fmt(result.checkedOutAt ?? new Date());

    let duration: string | null = null;
    if (reg.checkedInAt && result.checkedOutAt) {
      const ms = result.checkedOutAt.getTime() - reg.checkedInAt.getTime();
      const totalMinutes = Math.round(ms / 60000);
      const hours   = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    const html = buildHostCheckOutEmail({
      host: { name: host.name, logoUrl: host.logoUrl },
      visitor,
      checkInTime: checkInAt,
      checkOutTime: checkOutAt ?? '—',
      duration,
    });

    await this.mailService.sendEmail(
      host.email,
      `Visitor Checked Out — ${visitor.fullName}`,
      html,
    );
  }
}
