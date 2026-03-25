import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { Role } from '../common/enums/role.enum.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //lists all users, optionally filtered by role
  @ApiOperation({ summary: 'List all users (filterable by role)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Get()
  async findAll(@Query('role') role?: Role) {
    return this.usersService.findAll(role);
  }

  //Get a single user by id
  @ApiOperation({ summary: 'Get a single user by ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOneById(id);
  }

  // super admin creates an admin user
  @ApiOperation({ summary: 'Create an admin user (SuperAdmin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin)
  @Post('admin')
  async createAdmin(@Body() body: CreateUserDto) {
    const user = await this.usersService.createUser({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      role: Role.Admin,
      staffType: body.staffType,
    });

    return { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
  }

  // super admin or admin creates a staff user
  @ApiOperation({ summary: 'Create a staff user (SuperAdmin or Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Post('staff')
  async createStaff(@Body() body: CreateUserDto) {
    const user = await this.usersService.createUser({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      role: Role.Staff,
      staffType: body.staffType,
    });

    return { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
  }

  // super admin or admin updates user fields (role updates restricted to super admin)
  @ApiOperation({ summary: 'Update a user (role change restricted to SuperAdmin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateUserDto, @CurrentUser() actor: any) {
    if (body.role && actor?.role !== Role.SuperAdmin) {
      throw new ForbiddenException('Only super admin can change user role');
    }
    return this.usersService.updateUser(id, body, actor);
  }

  // only super admin can delete users
  @ApiOperation({ summary: 'Delete a user (SuperAdmin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}

