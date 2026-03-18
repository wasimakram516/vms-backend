import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { InputType } from '../../common/enums/input-type.enum.js';

export class CreateCustomFieldDto {
  @IsString()
  fieldKey: string;

  @IsString()
  label: string;

  @IsEnum(InputType)
  inputType: InputType;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  optionsJson?: string[];
}

