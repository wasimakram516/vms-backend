import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BadgeTemplate } from './entities/badge-template.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([BadgeTemplate])],
})
export class BadgeTemplatesModule {}
