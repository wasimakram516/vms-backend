import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto.js';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('custom-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin, Role.Admin)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post()
  async create(@Body() dto: CreateCustomFieldDto, @CurrentUser() user: any) {
    return this.customFieldsService.create(dto, user?.id);
  }

  @Get()
  async findAll() {
    return this.customFieldsService.findAll();
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomFieldDto, @CurrentUser() user: any) {
    return this.customFieldsService.update(id, dto, user?.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.customFieldsService.remove(id);
  }
}

