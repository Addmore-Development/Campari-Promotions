import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = 'Admin@123';
  const hashed = await bcrypt.hash(password, 12);

  // Delete existing admin first to avoid hash mismatch
  await prisma.user.deleteMany({ where: { email: 'admin@honeygroup.co.za' } });

  const user = await prisma.user.create({
    data: {
      fullName:         'Administrator',
      email:            'admin@honeygroup.co.za',
      password:         hashed,
      role:             'ADMIN',
      status:           'approved',
      onboardingStatus: 'approved',
      consentPopia:     true,
    },
  });

  console.log('Admin created successfully');
  console.log('Email:   ', user.email);
  console.log('Password: Admin@123');
  console.log('Hash:    ', user.password);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());