import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrTemplate } from './entities/qr-template.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([QrTemplate])],
})
export class QrTemplatesModule {}
