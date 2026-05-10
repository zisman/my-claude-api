import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StudentStatus } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string, status?: StudentStatus) {
    return this.prisma.student.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { firstName: 'asc' },
    });
  }

  findOne(id: string, tenantId: string) {
    return this.prisma.student.findFirst({
      where: { id, tenantId },
      include: {
        enrollments: { include: { course: { select: { title: true, level: true, startDate: true } } } },
        flightLogs: { orderBy: { date: 'desc' }, take: 10 },
      },
    });
  }

  create(tenantId: string, data: any) {
    return this.prisma.student.create({ data: { ...data, tenantId } });
  }

  update(id: string, tenantId: string, data: any) {
    return this.prisma.student.update({ where: { id }, data });
  }

  delete(id: string, tenantId: string) {
    return this.prisma.student.delete({ where: { id } });
  }

  async stats(tenantId: string) {
    const [total, active, graduated, prospect] = await Promise.all([
      this.prisma.student.count({ where: { tenantId } }),
      this.prisma.student.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.student.count({ where: { tenantId, status: 'GRADUATED' } }),
      this.prisma.student.count({ where: { tenantId, status: 'PROSPECT' } }),
    ]);
    return { total, active, graduated, prospect };
  }
}
