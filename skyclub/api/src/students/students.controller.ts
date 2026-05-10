import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private students: StudentsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.INSTRUCTOR, Role.RECEPTION)
  findAll(@TenantId() tenantId: string, @Query('status') status?: any) {
    return this.students.findAll(tenantId, status);
  }

  @Get('stats')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  stats(@TenantId() tenantId: string) {
    return this.students.stats(tenantId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR, Role.RECEPTION)
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.students.findOne(id, tenantId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.INSTRUCTOR, Role.RECEPTION)
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.students.create(tenantId, body);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.students.update(id, tenantId, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.students.delete(id, tenantId);
  }
}
