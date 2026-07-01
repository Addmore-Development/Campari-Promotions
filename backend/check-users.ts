import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'BUSINESS' },
    select: { id: true, fullName: true, email: true, role: true, status: true, createdAt: true }
  });
  console.log('Business users:', JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);