import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { StaffType } from '../../common/enums/staff-type.enum.js';

export class CreateUserDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(StaffType)
  staffType?: StaffType;
}

