import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpVerification } from './entities/otp-verification.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([OtpVerification])],
})
export class OtpVerificationsModule {}
