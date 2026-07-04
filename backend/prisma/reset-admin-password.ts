import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const NEW_PASSWORD = 'Admin@HG2026!';

async function main() {
  const hashed = await bcrypt.hash(NEW_PASSWORD, 10);
  const updated = await prisma.user.update({
    where: { email: 'admin@honeygroup.co.za' },
    data: { password: hashed },
  });
  console.log('Password reset for:', updated.email);
  console.log('New password is exactly:', JSON.stringify(NEW_PASSWORD));
}

main()
  .catch(e => { console.error('Reset failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });