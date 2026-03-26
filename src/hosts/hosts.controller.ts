import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HostsService } from './hosts.service.js';
import { CreateHostDto } from './dto/create-host.dto.js';
import { UpdateHostDto } from './dto/update-host.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Host')
@ApiBearerAuth()
@Controller('host')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin)
export class HostsController {
  constructor(private readonly hostsService: HostsService) {}

  @ApiOperation({ summary: 'Create host profile (once only)' })
  @Post()
  async create(@Body() dto: CreateHostDto, @CurrentUser() user: any) {
    return this.hostsService.create(dto, user?.id);
  }

  @ApiOperation({ summary: 'Get host profile' })
  @Get()
  async get() {
    return this.hostsService.get();
  }

  @ApiOperation({ summary: 'Update host profile' })
  @Patch()
  async update(@Body() dto: UpdateHostDto, @CurrentUser() user: any) {
    return this.hostsService.update(dto, user?.id);
  }

  @ApiOperation({ summary: 'Delete host profile' })
  @Delete()
  async remove() {
    return this.hostsService.remove();
  }
}
