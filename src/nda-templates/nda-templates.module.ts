import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NdaTemplate } from './entities/nda-template.entity.js';
import { UserNdaAcceptance } from './entities/user-nda-acceptance.entity.js';
import { NdaTemplatesService } from './nda-templates.service.js';
import { NdaTemplatesController, NdaTemplatesPublicController } from './nda-templates.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([NdaTemplate, UserNdaAcceptance])],
  controllers: [NdaTemplatesController, NdaTemplatesPublicController],
  providers: [NdaTemplatesService],
  exports: [NdaTemplatesService],
})
export class NdaTemplatesModule {}
