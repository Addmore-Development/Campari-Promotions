
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'Business@2026!';

interface BusinessSeed {
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  city: string;
  province: string;
  industry: string;
  vatNumber: string;
  regNumber: string; // stored in `address` per existing convention
  website?: string;
  openingCreditBalance: number;
  poAmount: number;
}

const BUSINESSES: BusinessSeed[] = [
  {
    email: 'accounts@castlelagersa.co.za',
    companyName: 'Castle Lager South Africa',
    contactName: 'Sipho Mahlangu',
    phone: '+27 11 555 0104',
    city: 'Johannesburg',
    province: 'Gauteng',
    industry: 'FMCG / Beverages',
    vatNumber: '4100112233',
    regNumber: '1998/003344/07',
    website: 'castlelager.co.za',
    openingCreditBalance: 150000,
    poAmount: 250000,
  },
  {
    email: 'promotions@redbullsa.co.za',
    companyName: 'Red Bull South Africa',
    contactName: 'James Mokoena',
    phone: '+27 11 555 0107',
    city: 'Johannesburg',
    province: 'Gauteng',
    industry: 'FMCG / Beverages',
    vatNumber: '4200223344',
    regNumber: '2005/098765/07',
    website: 'redbull.com/za',
    openingCreditBalance: 90000,
    poAmount: 180000,
  },
  {
    email: 'marketing@nandossa.co.za',
    companyName: "Nando's South Africa",
    contactName: 'Thandi Khumalo',
    phone: '+27 11 555 0111',
    city: 'Cape Town',
    province: 'Western Cape',
    industry: 'QSR',
    vatNumber: '4300334455',
    regNumber: '1990/004499/07',
    website: 'nandos.co.za',
    openingCreditBalance: 40000,
    poAmount: 80000,
  },
];

async function generatePoNumber(): Promise<string> {
  const now = new Date();
  const prefix = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;
  const count = await prisma.purchaseOrder.count({ where: { poNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

async function main() {
  console.log('Seeding businesses...\n');
  const hashed = await bcrypt.hash(PASSWORD, 12);

  for (const b of BUSINESSES) {
    const user = await prisma.user.upsert({
      where: { email: b.email },
      update: {
        password: hashed,
        status: 'approved',
        onboardingStatus: 'approved',
        creditBalance: b.openingCreditBalance,
      },
      create: {
        email: b.email,
        password: hashed,
        fullName: b.companyName,
        role: 'BUSINESS',
        status: 'approved',
        onboardingStatus: 'approved',
        consentPopia: true,
        phone: b.phone,
        city: b.city,
        province: b.province,
        contactName: b.contactName,
        vatNumber: b.vatNumber,
        industry: b.industry,
        website: b.website,
        address: b.regNumber, // registration number, per existing convention
        creditBalance: b.openingCreditBalance,
      },
    });
    console.log(`Business user: ${user.email} / ${PASSWORD}  (credit R${b.openingCreditBalance.toLocaleString()})`);

    // Sync CRM Client record (used by PurchaseOrder / ActivationReport)
    const client = await prisma.client.upsert({
      where: { email: b.email },
      update: {
        name: b.companyName,
        contact: b.contactName,
        phone: b.phone,
        city: b.city,
        industry: b.industry,
        status: 'active',
      },
      create: {
        name: b.companyName,
        contact: b.contactName,
        email: b.email,
        phone: b.phone,
        city: b.city,
        industry: b.industry,
        status: 'active',
      },
    });

    // Opening Purchase Order so Budget Tracking has real data
    const existingPo = await prisma.purchaseOrder.findFirst({ where: { clientId: client.id } });
    if (!existingPo) {
      const poNumber = await generatePoNumber();
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 3);
      await prisma.purchaseOrder.create({
        data: {
          clientId: client.id,
          poNumber,
          amount: b.poAmount,
          periodStart,
          periodEnd,
          description: `Opening quarterly PO for ${b.companyName}`,
          status: 'active',
          createdBy: user.id,
        },
      });
      console.log(`  -> PO ${poNumber} for R${b.poAmount.toLocaleString()}`);
    }
    console.log('');
  }

  console.log('Business seed complete.');
}

main()
  .catch(e => { console.error('Business seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });