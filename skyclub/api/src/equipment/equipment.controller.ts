import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EquipmentService } from './equipment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentController {
  constructor(private equipment: EquipmentService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('status') status?: any) {
    return this.equipment.findAll(tenantId, status);
  }

  @Get('stats')
  stats(@TenantId() tenantId: string) {
    return this.equipment.stats(tenantId);
  }

  @Get('service-orders')
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR)
  findServiceOrders(@TenantId() tenantId: string, @Query('status') status?: any) {
    return this.equipment.findServiceOrders(tenantId, status);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.equipment.findOne(id, tenantId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.equipment.create(tenantId, body);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.equipment.update(id, tenantId, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.equipment.delete(id);
  }

  @Post('service-orders')
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.RECEPTION)
  createServiceOrder(@TenantId() tenantId: string, @Body() body: any) {
    return this.equipment.createServiceOrder(tenantId, body);
  }

  @Put('service-orders/:id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  updateServiceOrder(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.equipment.updateServiceOrder(id, tenantId, body);
  }
}
