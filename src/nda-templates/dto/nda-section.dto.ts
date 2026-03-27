import { IsOptional, IsString } from 'class-validator';

export class CreateNdaTemplateDto {
  @IsString()
  name: string;

  @IsString()
  preamble: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  visitorRecordTitle?: string;

  @IsOptional()
  @IsString()
  visitorRecordNote?: string;

  @IsOptional()
  @IsString()
  footer?: string;
}
