import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateNdaTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  preamble?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  visitorRecordTitle?: string;

  @IsOptional()
  @IsString()
  visitorRecordNote?: string;

  @IsOptional()
  @IsString()
  footer?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
