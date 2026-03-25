import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { RegistrationStatus } from '../common/enums/registration-status.enum.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { UpdateRegistrationDto } from './dto/update-registration.dto.js';
import { ApproveRegistrationDto } from './dto/approve-registration.dto.js';
import { RejectRegistrationDto } from './dto/reject-registration.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @ApiOperation({ summary: 'Get registration form fields' })
  @Get('form/fields')
  async getFormFields() {
    return this.registrationsService.getFormFields();
  }

  @ApiOperation({ summary: 'Submit a new registration (public)' })
  @Post()
  async create(@Body() dto: CreateRegistrationDto) {
    return this.registrationsService.create(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a registration by QR token (staff)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin, Role.Staff)
  @Get('verify')
  async verifyByToken(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('token query parameter is required');
    }
    return this.registrationsService.verifyByToken(token);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all registrations (filterable by status)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Get()
  async findAll(
    @Query('status') status?: RegistrationStatus,
    @CurrentUser() actor?: { id: string },
  ) {
    return this.registrationsService.findAll(status);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single registration by ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.registrationsService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a registration' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRegistrationDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.registrationsService.update(id, dto, actor.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a registration' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.registrationsService.remove(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a registration' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveRegistrationDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.registrationsService.approve(id, dto, actor.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a registration' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectRegistrationDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.registrationsService.reject(id, dto, actor.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a registration' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Patch(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string },
  ) {
    return this.registrationsService.cancel(id, actor.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check in a visitor (staff)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin, Role.Staff)
  @Patch(':id/checkin')
  async checkIn(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string },
  ) {
    return this.registrationsService.checkIn(id, actor.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check out a visitor (staff)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin, Role.Staff)
  @Patch(':id/checkout')
  async checkOut(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string },
  ) {
    return this.registrationsService.checkOut(id, actor.id);
  }
}
