import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquipmentStatus, ServiceStatus } from '@prisma/client';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string, status?: EquipmentStatus) {
    return this.prisma.equipmentItem.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string, tenantId: string) {
    return this.prisma.equipmentItem.findFirst({
      where: { id, tenantId },
      include: {
        serviceOrders: { orderBy: { intakeAt: 'desc' }, take: 5 },
      },
    });
  }

  create(tenantId: string, data: any) {
    return this.prisma.equipmentItem.create({ data: { ...data, tenantId } });
  }

  update(id: string, tenantId: string, data: any) {
    return this.prisma.equipmentItem.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.equipmentItem.delete({ where: { id } });
  }

  // Service orders
  findServiceOrders(tenantId: string, status?: ServiceStatus) {
    return this.prisma.serviceOrder.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: {
        equipment: { select: { type: true, brand: true, model: true, serial: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
      orderBy: { intakeAt: 'desc' },
    });
  }

  createServiceOrder(tenantId: string, data: any) {
    return this.prisma.serviceOrder.create({ data: { ...data, tenantId } });
  }

  updateServiceOrder(id: string, tenantId: string, data: any) {
    return this.prisma.serviceOrder.update({ where: { id }, data });
  }

  async stats(tenantId: string) {
    const [total, available, inService, serviceOrders] = await Promise.all([
      this.prisma.equipmentItem.count({ where: { tenantId } }),
      this.prisma.equipmentItem.count({ where: { tenantId, status: 'AVAILABLE' } }),
      this.prisma.equipmentItem.count({ where: { tenantId, status: 'IN_SERVICE' } }),
      this.prisma.serviceOrder.count({ where: { tenantId, status: { notIn: ['CLOSED', 'SHIPPED'] } } }),
    ]);
    return { total, available, inService, openServiceOrders: serviceOrders };
  }
}
