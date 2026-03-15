import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NdaTemplate } from './entities/nda-template.entity.js';
import { UserNdaAcceptance } from './entities/user-nda-acceptance.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([NdaTemplate, UserNdaAcceptance])],
})
export class NdaTemplatesModule {}
