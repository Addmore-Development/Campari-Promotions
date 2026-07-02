import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('Admin@HG2026!', 10);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@honeygroup.co.za' },
    update: {
      password:         adminPassword,
      status:           'approved',
      onboardingStatus: 'complete',
    },
    create: {
      email:            'admin@honeygroup.co.za',
      password:         adminPassword,
      fullName:         'Administrator',
      role:             'ADMIN',
      status:           'approved',
      onboardingStatus: 'complete',
      consentPopia:     true,
      phone:            '+27 11 000 0001',
      city:             'Johannesburg',
      province:         'Gauteng',
    },
  });

  console.log('Admin created/updated:', admin.email);
  console.log('');
  console.log('Seeding complete!');
  console.log('Admin: admin@honeygroup.co.za / Admin@HG2026!');
  console.log('Promoter and Business accounts are created via the registration flow.');
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });