import { IsOptional, IsString } from 'class-validator';

export class ApproveRegistrationDto {
  @IsString()
  @IsOptional()
  approvedDate?: string;

  @IsString()
  @IsOptional()
  approvedTimeFrom?: string;

  @IsString()
  @IsOptional()
  approvedTimeTo?: string;
}
