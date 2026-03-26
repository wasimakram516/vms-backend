import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateHostDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsUrl()
  website?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  contactPersonName?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsEmail()
  contactPersonEmail?: string;

  @IsOptional()
  @IsString()
  contactPersonPhone?: string;
}
