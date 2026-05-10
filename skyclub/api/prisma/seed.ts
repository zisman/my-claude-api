import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SkyClub database...');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'skyclub' },
    update: {},
    create: {
      name: 'SkyClub Paragliding',
      slug: 'skyclub',
      currency: 'ILS',
      timezone: 'Asia/Jerusalem',
    },
  });

  const hash = (p: string) => bcrypt.hashSync(p, 10);

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@skyclub.com' } },
    update: {},
    create: { tenantId: tenant.id, email: 'admin@skyclub.com', hashedPwd: hash('Admin123!'), firstName: 'Admin', lastName: 'User', role: 'ADMIN' },
  });

  const instructor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'yael@skyclub.com' } },
    update: {},
    create: { tenantId: tenant.id, email: 'yael@skyclub.com', hashedPwd: hash('Instr123!'), firstName: 'Yael', lastName: 'Cohen', role: 'INSTRUCTOR', phone: '+972-52-2222222' },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'tech@skyclub.com' } },
    update: {},
    create: { tenantId: tenant.id, email: 'tech@skyclub.com', hashedPwd: hash('Tech123!'), firstName: 'Avi', lastName: 'Shapiro', role: 'TECHNICIAN' },
  });

  // Flight sites
  const gilboa = await prisma.flightSite.upsert({
    where: { id: 'site-gilboa' },
    update: {},
    create: { id: 'site-gilboa', tenantId: tenant.id, name: 'Mount Gilboa', lat: 32.4833, lon: 35.3833, altitudeM: 500 },
  });

  // Students
  const studentsData = [
    { firstName: 'David', lastName: 'Shapiro', email: 'david@example.com', phone: '+972-52-4444444', status: 'ACTIVE' as const, licenseLevel: 'P1', totalFlights: 12, totalHours: 8.5 },
    { firstName: 'Michal', lastName: 'Katz', email: 'michal@example.com', phone: '+972-52-5555555', status: 'ACTIVE' as const, licenseLevel: 'P2', totalFlights: 45, totalHours: 38 },
    { firstName: 'Rotem', lastName: 'Ben-David', email: 'rotem@example.com', phone: '+972-52-6666666', status: 'PROSPECT' as const, totalFlights: 0, totalHours: 0 },
    { firstName: 'Oren', lastName: 'Levi', email: 'oren@example.com', phone: '+972-52-7777777', status: 'GRADUATED' as const, licenseLevel: 'P3', totalFlights: 120, totalHours: 145 },
  ];

  for (const s of studentsData) {
    await prisma.student.upsert({
      where: { id: `student-${s.email}` },
      update: {},
      create: { id: `student-${s.email}`, tenantId: tenant.id, ...s },
    });
  }

  // Equipment
  const equipmentData = [
    { type: 'WING' as const, brand: 'Advance', model: 'Alpha 7', serial: 'ADV-A7-001', status: 'AVAILABLE' as const, usageHours: 245.5 },
    { type: 'WING' as const, brand: 'Gin', model: 'Boomerang 12', serial: 'GIN-B12-003', status: 'AVAILABLE' as const, usageHours: 180 },
    { type: 'WING' as const, brand: 'Nova', model: 'Mentor 7', serial: 'NOV-M7-007', status: 'IN_SERVICE' as const, usageHours: 420 },
    { type: 'HARNESS' as const, brand: 'Kortel', model: 'Karver', serial: 'KRT-KV-012', status: 'AVAILABLE' as const },
    { type: 'HARNESS' as const, brand: 'Woody Valley', model: 'X-Rated 8', serial: 'WV-XR8-004', status: 'AVAILABLE' as const },
    { type: 'RESERVE' as const, brand: 'Charly', model: 'X-Over', serial: 'CHA-XO-008', status: 'AVAILABLE' as const },
    { type: 'HELMET' as const, brand: 'POC', model: 'Trabec Race', serial: 'POC-TR-015', status: 'AVAILABLE' as const },
  ];

  for (const e of equipmentData) {
    await prisma.equipmentItem.upsert({
      where: { qrCode: `qr-${e.serial}` },
      update: {},
      create: { tenantId: tenant.id, qrCode: `qr-${e.serial}`, ...e },
    });
  }

  // Course
  const course = await prisma.course.upsert({
    where: { id: 'course-beginner-1' },
    update: {},
    create: {
      id: 'course-beginner-1',
      tenantId: tenant.id,
      title: 'Paragliding Beginner Course',
      description: 'Complete beginner course from ground handling to first solo flights',
      level: 'BASIC',
      priceCents: 250000,
      maxStudents: 8,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-06-15'),
      status: 'ACTIVE',
      instructorId: instructor.id,
    },
  });

  console.log('✅ Seed complete!');
  console.log('\n📋 Demo credentials:');
  console.log('  Slug:       skyclub');
  console.log('  Admin:      admin@skyclub.com / Admin123!');
  console.log('  Instructor: yael@skyclub.com / Instr123!');
  console.log('  Technician: tech@skyclub.com / Tech123!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
