import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true, createdAt: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async create(tenantId: string, data: { email: string; password: string; firstName: string; lastName: string; role: Role; phone?: string }) {
    const exists = await this.prisma.user.findFirst({ where: { tenantId, email: data.email } });
    if (exists) throw new ConflictException('Email already in use');
    return this.prisma.user.create({
      data: { tenantId, email: data.email, hashedPwd: bcrypt.hashSync(data.password, 10), firstName: data.firstName, lastName: data.lastName, role: data.role, phone: data.phone },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
  }

  update(id: string, tenantId: string, data: Partial<{ firstName: string; lastName: string; phone: string; role: Role; isActive: boolean }>) {
    return this.prisma.user.update({ where: { id }, data, select: { id: true, email: true, firstName: true, lastName: true, role: true } });
  }
}
