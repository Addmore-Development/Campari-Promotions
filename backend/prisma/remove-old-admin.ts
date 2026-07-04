import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.deleteMany({
    where: { email: 'admin@campari.co.za' },
  });
  console.log(`Deleted ${result.count} account(s) matching admin@campari.co.za`);
}

main()
  .catch(e => { console.error('Delete failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });