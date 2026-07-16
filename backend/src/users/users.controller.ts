import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { UserRole } from '@prisma/client';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Permissions('users:read')
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Permissions('users:create')
  @Post('invite')
  async inviteUser(@Body() dto: { email: string, name: string, role: UserRole, customRoleId?: string }) {
    return this.usersService.inviteUser(dto);
  }

  @Permissions('users:update')
  @Put(':id/role')
  async updateUserRole(
    @Param('id') userId: string, 
    @Body() dto: { role: UserRole, customRoleId?: string }
  ) {
    return this.usersService.updateUserRole(userId, dto);
  }

  @Permissions('users:delete')
  @Delete(':id')
  async removeUser(@Param('id') userId: string) {
    return this.usersService.removeUser(userId);
  }
}
