import { IsNotEmpty, IsString } from 'class-validator';

export class RejectRegistrationDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}
