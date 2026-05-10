import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.course.findMany({
      where: { tenantId },
      include: {
        _count: { select: { enrollments: true, lessons: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  findOne(id: string, tenantId: string) {
    return this.prisma.course.findFirst({
      where: { id, tenantId },
      include: {
        lessons: { include: { site: true, instructor: { select: { firstName: true, lastName: true } } }, orderBy: { scheduledAt: 'asc' } },
        enrollments: { include: { student: { select: { firstName: true, lastName: true, licenseLevel: true } } } },
      },
    });
  }

  create(tenantId: string, data: any) {
    return this.prisma.course.create({ data: { ...data, tenantId } });
  }

  update(id: string, tenantId: string, data: any) {
    return this.prisma.course.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.course.delete({ where: { id } });
  }

  enroll(courseId: string, tenantId: string, studentId: string) {
    return this.prisma.enrollment.create({
      data: { courseId, studentId, tenantId },
    });
  }

  createLesson(courseId: string, data: any) {
    return this.prisma.lesson.create({ data: { ...data, courseId } });
  }
}
