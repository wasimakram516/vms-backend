import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { randomInt } from 'crypto';
import { hash, compare } from 'bcryptjs';
import { OtpVerification } from './entities/otp-verification.entity.js';
import { OtpChannel } from '../common/enums/otp-channel.enum.js';
import { MailService } from '../mail/mail.service.js';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { Registration } from '../registrations/entities/registration.entity.js';
import { RegistrationFieldValue } from '../registrations/entities/registration-field-value.entity.js';
import { buildOtpEmail } from '../mail/templates/otp.template.js';

@Injectable()
export class OtpVerificationsService {
  constructor(
    @InjectRepository(OtpVerification)
    private readonly otpRepo: Repository<OtpVerification>,
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    @InjectRepository(RegistrationFieldValue)
    private readonly fieldValueRepo: Repository<RegistrationFieldValue>,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
  ) {}

  async sendOtp(target: string): Promise<void> {
    // Ensure the email belongs to an existing visitor
    const existing = await this.usersService.findByEmail(target);
    if (!existing) {
      throw new NotFoundException('No visitor found with this email address');
    }

    // Enforce 60-second cooldown between OTP requests
    const cooldownFrom = new Date(Date.now() - 60 * 1000);
    const recent = await this.otpRepo.findOne({
      where: { target, createdAt: MoreThan(cooldownFrom) },
      order: { createdAt: 'DESC' },
    });
    if (recent) {
      const secondsLeft = Math.ceil((recent.createdAt.getTime() + 60 * 1000 - Date.now()) / 1000);
      throw new HttpException(
        `Please wait ${secondsLeft} second(s) before requesting a new OTP`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Invalidate all previous unused OTPs for this target
    await this.otpRepo
      .createQueryBuilder()
      .update(OtpVerification)
      .set({ verifiedAt: new Date() })
      .where('target = :target', { target })
      .andWhere('verifiedAt IS NULL')
      .execute();

    // Generate 4-digit code and hash it
    const code = randomInt(1000, 10000).toString();
    const codeHash = await hash(code, 10);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.otpRepo.save(
      this.otpRepo.create({
        target,
        channel: OtpChannel.Email,
        purpose: 'visitor-login',
        codeHash,
        expiresAt,
      }),
    );

    const html = buildOtpEmail(code);
    await this.mailService.sendEmail(target, 'Your Verification Code', html);
  }

  async verifyOtp(
    target: string,
    code: string,
  ): Promise<{ isNewUser: boolean; user: User | null; lastFieldValues: Record<string, unknown> }> {
    const record = await this.otpRepo.findOne({
      where: {
        target,
        verifiedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const isMatch = await compare(code, record.codeHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    record.verifiedAt = new Date();
    await this.otpRepo.save(record);

    const { user, isNewUser } = await this.usersService.findByIdentity(target);

    let lastFieldValues: Record<string, unknown> = {};
    if (user) {
      const lastReg = await this.registrationRepo.findOne({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      });
      if (lastReg) {
        const fieldValues = await this.fieldValueRepo.find({
          where: { registrationId: lastReg.id },
          relations: ['customField'],
        });
        for (const fv of fieldValues) {
          if (fv.customField?.fieldKey) {
            lastFieldValues[fv.customField.fieldKey] = fv.value;
          }
        }
      }
    }

    return { isNewUser, user, lastFieldValues };
  }
}
