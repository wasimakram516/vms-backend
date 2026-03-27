import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NdaTemplatesService } from './nda-templates.service.js';
import { CreateNdaTemplateDto } from './dto/nda-section.dto.js';
import { UpdateNdaTemplateDto } from './dto/update-nda-template.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// ── Public: no auth required ──────────────────────────────────────────────────
@ApiTags('NDA Templates (Public)')
@Controller('nda-templates/public')
export class NdaTemplatesPublicController {
  constructor(private readonly service: NdaTemplatesService) {}

  @ApiOperation({ summary: 'Get active NDA template (public — for visitor popup)' })
  @Get('active')
  async findActive() {
    return this.service.findActive();
  }
}

// ── Admin: SuperAdmin only ─────────────────────────────────────────────────────
@ApiTags('NDA Templates')
@ApiBearerAuth()
@Controller('nda-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin)
export class NdaTemplatesController {
  constructor(private readonly service: NdaTemplatesService) {}

  @ApiOperation({ summary: 'Create NDA template' })
  @Post()
  async create(@Body() dto: CreateNdaTemplateDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.id);
  }

  @ApiOperation({ summary: 'List all NDA templates' })
  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get active NDA template' })
  @Get('active')
  async findActive() {
    return this.service.findActive();
  }

  @ApiOperation({ summary: 'Get NDA template by ID' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Update NDA template' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateNdaTemplateDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user?.id);
  }

  @ApiOperation({ summary: 'Set NDA template as active (deactivates others)' })
  @Patch(':id/activate')
  async activate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.activate(id, user?.id);
  }

  @ApiOperation({ summary: 'Deactivate NDA template' })
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deactivate(id, user?.id);
  }

  @ApiOperation({ summary: 'Delete NDA template' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @ApiOperation({ summary: 'List all NDA forms (accepted + PDF generated)' })
  @Get('acceptances/forms')
  async findAllForms() {
    return this.service.findAllForms();
  }
}
