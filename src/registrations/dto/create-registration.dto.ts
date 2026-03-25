import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateRegistrationDto {
  @IsString()
  @IsOptional()
  userId?: string;

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
  @IsNotEmpty()
  requestedDateFrom: string;

  @IsString()
  @IsNotEmpty()
  requestedDateTo: string;

  @IsString()
  @IsNotEmpty()
  requestedTimeFrom: string;

  @IsString()
  @IsNotEmpty()
  requestedTimeTo: string;

  @IsString()
  @IsOptional()
  purposeOfVisit?: string;

  @IsObject()
  @IsOptional()
  fieldValues?: Record<string, unknown>;
}
