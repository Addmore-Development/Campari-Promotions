import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@campari.co.za';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hashed = await bcrypt.hash(password, 12);

  // Delete existing admin first to avoid hash mismatch
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      fullName:         'Administrator',
      email,
      password:         hashed,
      role:             'ADMIN',
      status:           'approved',
      onboardingStatus: 'approved',
      consentPopia:     true,
    },
  });

  console.log('Admin created successfully');
  console.log('Email:   ', user.email);
  console.log('Password:', password);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
