import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('Admin@HG2026!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@honeygroup.co.za' },
    update: { password: hashed, role: 'ADMIN', status: 'approved', onboardingStatus: 'approved' },
    create: {
      fullName: 'Administrator',
      email: 'admin@honeygroup.co.za',
      password: hashed,
      role: 'ADMIN',
      status: 'approved',
      onboardingStatus: 'approved',
      consentPopia: true,
    },
  });
  console.log('Admin created successfully');
  await prisma.$disconnect();
}

main().catch(console.error);
