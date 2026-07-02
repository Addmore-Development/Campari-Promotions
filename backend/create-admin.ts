import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@campari.co.za';
  const password = process.env.ADMIN_PASSWORD || 'Admin@CA2026!';
  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: 'ADMIN', status: 'approved', onboardingStatus: 'approved' },
    create: {
      fullName: 'Administrator',
      email,
      password: hashed,
      role: 'ADMIN',
      status: 'approved',
      onboardingStatus: 'approved',
      consentPopia: true,
    },
  });
  console.log('Admin created successfully:', email);
  await prisma.$disconnect();
}

main().catch(console.error);