import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomFieldsService } from './custom-fields.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto.js';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@Controller('custom-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin, Role.Admin)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @ApiOperation({ summary: 'Create a custom field' })
  @Post()
  async create(@Body() dto: CreateCustomFieldDto, @CurrentUser() user: any) {
    return this.customFieldsService.create(dto, user?.id);
  }

  @ApiOperation({ summary: 'List all custom fields' })
  @Get()
  async findAll() {
    return this.customFieldsService.findAll();
  }

  @ApiOperation({ summary: 'Update a custom field' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomFieldDto, @CurrentUser() user: any) {
    return this.customFieldsService.update(id, dto, user?.id);
  }

  @ApiOperation({ summary: 'Delete a custom field' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.customFieldsService.remove(id);
  }
}

