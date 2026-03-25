import { IsNotEmpty, IsNumberString, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  target: string; // email or phone number

  @IsNumberString()
  @Length(4, 4)
  code: string;
}
