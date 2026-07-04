// prisma/seed-demo.ts
// Demo/test accounts — businesses, promoters, and supervisors — for local
// and staging testing. Safe to run multiple times (all upserts on email).
//
// Run with:  npx ts-node prisma/seed-demo.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Demo@2026!'; // same password on every demo account, for convenience

async function upsertUser(data: {
  email: string;
  fullName: string;
  role: 'BUSINESS' | 'PROMOTER' | 'SUPERVISOR';
  phone?: string;
  extra?: Record<string, any>;
}) {
  const hashed = await bcrypt.hash(PASSWORD, 12);
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      password: hashed,
      fullName: data.fullName,
      role: data.role,
      status: 'approved',
      onboardingStatus: 'approved',
      consentPopia: true,
      phone: data.phone,
      ...data.extra,
    },
    create: {
      email: data.email,
      password: hashed,
      fullName: data.fullName,
      role: data.role,
      status: 'approved',
      onboardingStatus: 'approved',
      consentPopia: true,
      phone: data.phone,
      city: 'Durban',
      province: 'KwaZulu-Natal',
      ...data.extra,
    },
  });
}

async function main() {
  console.log('Seeding demo accounts...\n');

  // ── Business ─────────────────────────────────────────────────────────
  // HoneyGroup SA — client running the Courvoisier & Espolon campaign
  // shown in the Formal On Trade / Main Market schedule.
  const business = await upsertUser({
    email: 'business@honeygroup-demo.co.za',
    fullName: 'HoneyGroup SA',
    role: 'BUSINESS',
    phone: '+27 31 000 1000',
    extra: {
      contactName: 'HoneyGroup SA',
      industry: 'FMCG / Beverages',
      vatNumber: '4000123456',
    },
  });
  console.log('Business:   business@honeygroup-demo.co.za /', PASSWORD);

  // ── Promoters ────────────────────────────────────────────────────────
  const promoterNames = [
    'Lerato Mokoena', 'Musa Dube', 'Thandeka Zulu', 'Sipho Ngcobo', 'Amahle Khumalo',
  ];
  for (let i = 0; i < promoterNames.length; i++) {
    const email = `promoter${i + 1}@honeygroup-demo.co.za`;
    await upsertUser({
      email,
      fullName: promoterNames[i],
      role: 'PROMOTER',
      phone: `+27 7${i} 000 000${i}`,
      extra: {
        idNumber: `950101500${i}087`,
        gender: i % 2 === 0 ? 'female' : 'male',
        height: 165 + i,
        clothingSize: 'M',
        industry: 'Brand Activation, Sampling & Demonstrations',
      },
    });
    console.log(`Promoter:   ${email} / ${PASSWORD}`);
  }

  // ── Supervisors ──────────────────────────────────────────────────────
  // Two supervisors, matching the two campaign streams on the schedule:
  // Formal On Trade (venues/carwashes/clubs) and Main Market (stores).
  const supervisor1 = await upsertUser({
    email: 'supervisor1@honeygroup-demo.co.za',
    fullName: 'Nomvula Mthembu',
    role: 'SUPERVISOR',
    phone: '+27 71 111 0001',
    extra: { workField: 'Formal On Trade', businessId: business.id },
  });
  console.log(`Supervisor: ${supervisor1.email} / ${PASSWORD}  (Formal On Trade -> ${business.fullName})`);

  const supervisor2 = await upsertUser({
    email: 'supervisor2@honeygroup-demo.co.za',
    fullName: 'Bongani Cele',
    role: 'SUPERVISOR',
    phone: '+27 71 111 0002',
    extra: { workField: 'Main Market', businessId: business.id },
  });
  console.log(`Supervisor: ${supervisor2.email} / ${PASSWORD}  (Main Market -> ${business.fullName})`);

  console.log('\nDemo seed complete. All accounts share the password:', PASSWORD);
}

main()
  .catch(e => { console.error('Demo seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });