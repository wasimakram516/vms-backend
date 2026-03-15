import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomField } from './entities/custom-field.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([CustomField])],
})
export class CustomFieldsModule {}
