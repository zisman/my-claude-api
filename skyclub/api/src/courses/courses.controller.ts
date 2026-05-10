import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private courses: CoursesService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.courses.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.courses.findOne(id, tenantId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.courses.create(tenantId, body);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.courses.update(id, tenantId, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.courses.delete(id);
  }

  @Post(':id/enroll')
  @Roles(Role.ADMIN, Role.INSTRUCTOR, Role.RECEPTION)
  enroll(@TenantId() tenantId: string, @Param('id') courseId: string, @Body() body: { studentId: string }) {
    return this.courses.enroll(courseId, tenantId, body.studentId);
  }

  @Post(':id/lessons')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  createLesson(@Param('id') courseId: string, @Body() body: any) {
    return this.courses.createLesson(courseId, body);
  }
}
