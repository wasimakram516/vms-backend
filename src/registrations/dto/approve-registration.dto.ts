import { IsOptional, IsString } from 'class-validator';

export class ApproveRegistrationDto {
  @IsString()
  @IsOptional()
  approvedDateFrom?: string;

  @IsString()
  @IsOptional()
  approvedDateTo?: string;

  @IsString()
  @IsOptional()
  approvedTimeFrom?: string;

  @IsString()
  @IsOptional()
  approvedTimeTo?: string;

  @IsString()
  @IsOptional()
  approvedTimezone?: string;
}
