import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  findAll(@TenantId() tenantId: string) {
    return this.users.findAll(tenantId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.users.create(tenantId, body);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.users.update(id, tenantId, body);
  }
}
