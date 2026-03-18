import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { RegistrationStatus } from '../../common/enums/registration-status.enum.js';

export class UpdateRegistrationDto {
  @IsString()
  @IsOptional()
  ndaAcceptanceId?: string;

  @IsString()
  @IsOptional()
  badgeTemplateId?: string;

  @IsString()
  @IsOptional()
  qrTemplateId?: string;

  @IsString()
  @IsOptional()
  requestedDate?: string;

  @IsString()
  @IsOptional()
  requestedTimeFrom?: string;

  @IsString()
  @IsOptional()
  requestedTimeTo?: string;

  @IsString()
  @IsOptional()
  purposeOfVisit?: string;

  @IsEnum(RegistrationStatus)
  @IsOptional()
  status?: RegistrationStatus;

  @IsObject()
  @IsOptional()
  fieldValues?: Record<string, unknown>;
}
