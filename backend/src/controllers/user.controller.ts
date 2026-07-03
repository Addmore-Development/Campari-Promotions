import { Response } from 'express';
import { prisma }   from '../config';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path   from 'path';
import fs     from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { auditLog } from '../utils/auditLogger';

// ── Multer setup ────────────────────────────────────────────────────────────
const docDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });

const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, docDir),
  filename:    (_req, file, cb)  => cb(null, `${Date.now()}-${file.originalname}`),
});

export const documentUpload = multer({
  storage: docStorage,
  limits:  { fileSize: 20 * 1024 * 1024 },
}).fields([
  { name: 'headshot',      maxCount: 1 },
  { name: 'fullBodyPhoto', maxCount: 1 },
  { name: 'cv',            maxCount: 1 },
  { name: 'profilePhoto',  maxCount: 1 },
  { name: 'cipcDoc',       maxCount: 1 },
  { name: 'taxPin',        maxCount: 1 },
  { name: 'bizBankProof',  maxCount: 1 },
  { name: 'bankProof',     maxCount: 1 },
]);

// ── Normalise status — always store lowercase ────────────────────────────────
function normaliseStatus(s: string): string {
  return s.toLowerCase().trim();
}

// ── Shared helper: extract file URLs from multer fields ──────────────────────
function extractFileUrls(files: { [fieldname: string]: Express.Multer.File[] }): Record<string, string> {
  const data: Record<string, string> = {};
  if (files?.headshot?.[0])      data.headshotUrl      = `/uploads/documents/${files.headshot[0].filename}`;
  if (files?.fullBodyPhoto?.[0]) data.fullBodyPhotoUrl = `/uploads/documents/${files.fullBodyPhoto[0].filename}`;
  if (files?.cv?.[0])            data.cvUrl            = `/uploads/documents/${files.cv[0].filename}`;
  if (files?.profilePhoto?.[0])  data.profilePhotoUrl  = `/uploads/documents/${files.profilePhoto[0].filename}`;
  if (files?.cipcDoc?.[0])       data.cipcDocUrl       = `/uploads/documents/${files.cipcDoc[0].filename}`;
  if (files?.taxPin?.[0])        data.taxPinUrl        = `/uploads/documents/${files.taxPin[0].filename}`;
  if (files?.bizBankProof?.[0])  data.bizBankProofUrl  = `/uploads/documents/${files.bizBankProof[0].filename}`;
  // bankProof is an alias for bizBankProofUrl (promoter bank statement)
  if (files?.bankProof?.[0])     data.bizBankProofUrl  = `/uploads/documents/${files.bankProof[0].filename}`;
  return data;
}

// ── Admin: create a user directly (used for staff accounts like Supervisors,
// where there's no self-registration flow) ─────────────────────────────────
export const adminCreateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone, city, role, password, workField, businessId } = req.body;

    if (!fullName || !email || !role) {
      res.status(400).json({ error: 'fullName, email and role are required' });
      return;
    }

    const normalizedRole = (role as string).toUpperCase();
    if (!['PROMOTER', 'BUSINESS', 'ADMIN', 'SUPERVISOR'].includes(normalizedRole)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    // Supervisors must be linked to the business they work under.
    let resolvedBusinessId: string | null = null;
    if (normalizedRole === 'SUPERVISOR') {
      if (!businessId) {
        res.status(400).json({ error: 'businessId is required when creating a supervisor' });
        return;
      }
      const biz = await prisma.user.findUnique({ where: { id: businessId }, select: { id: true, role: true } });
      if (!biz || biz.role !== 'BUSINESS') {
        res.status(400).json({ error: 'businessId must belong to a BUSINESS user' });
        return;
      }
      resolvedBusinessId = biz.id;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Admin-created accounts (e.g. Supervisors) skip the onboarding queue —
    // they're staff being provisioned directly, not applicants.
    const usedGeneratedPassword = !password || String(password).length < 6;
    const plainPassword = usedGeneratedPassword ? crypto.randomBytes(6).toString('hex') : password;
    const hashed = await bcrypt.hash(plainPassword, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        password: hashed,
        role: normalizedRole as any,
        phone: phone || null,
        city: city || null,
        status: 'approved',
        onboardingStatus: 'approved',
        workField:  normalizedRole === 'SUPERVISOR' ? (workField || null) : null,
        businessId: normalizedRole === 'SUPERVISOR' ? resolvedBusinessId : null,
      },
    });

    await auditLog({
      userId: req.user!.id,
      action: 'ADMIN_CREATE_USER',
      entity: 'User',
      entityId: user.id,
      meta: { role: normalizedRole, businessId: resolvedBusinessId },
    });

    res.status(201).json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      city: user.city,
      createdAt: user.createdAt,
      // Only returned when we generated it — the admin needs to hand it to the new user
      temporaryPassword: usedGeneratedPassword ? plainPassword : undefined,
    });
  } catch (err) {
    console.error('[User] adminCreateUser error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// ── GET all users (admin) ───────────────────────────────────────────────────
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, status } = req.query;
    const where: any = {};

    if (req.user?.role === 'SUPERVISOR') {
      // Supervisors can only ever list business accounts — not promoters,
      // admins, or other supervisors.
      where.role = 'BUSINESS';
    } else if (role) {
      where.role = (role as string).toUpperCase();
    }

    if (status) {
      const s = (status as string).toLowerCase().trim();
      if (s === 'approved') {
        where.status = { in: ['approved', 'APPROVED'] };
      } else if (s === 'pending' || s === 'pending_review') {
        where.status = { in: ['pending_review', 'pending', 'PENDING', 'PENDING_REVIEW'] };
      } else if (s === 'all' || s === '') {
        // no filter
      } else {
        where.status = s;
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, phone: true, role: true,
        status: true, onboardingStatus: true, city: true, province: true,
        streetNumber: true, streetName: true, suburb: true, postalCode: true,
        reliabilityScore: true, profilePhotoUrl: true, headshotUrl: true,
        fullBodyPhotoUrl: true, createdAt: true, gender: true,
        height: true, clothingSize: true, shoeSize: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    console.error('[User] getAllUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// ── GET single user ─────────────────────────────────────────────────────────
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id === 'me' ? req.user!.id : req.params.id;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, email: true, phone: true, role: true,
        status: true, onboardingStatus: true, city: true, province: true,
        streetNumber: true, streetName: true, suburb: true, postalCode: true,
        reliabilityScore: true, profilePhotoUrl: true, headshotUrl: true,
        fullBodyPhotoUrl: true, cvUrl: true, createdAt: true,
        gender: true, height: true, clothingSize: true, shoeSize: true,
        idNumber: true, bankName: true, accountNumber: true, branchCode: true,
        rejectionReason: true, consentPopia: true, vatNumber: true,
        industry: true, website: true, contactName: true,
        cipcDocUrl: true, taxPinUrl: true, bizBankProofUrl: true,
        address: true, creditBalance: true,
      },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    if (req.user?.role === 'SUPERVISOR' && req.params.id !== 'me') {
      if (user.role !== 'BUSINESS') {
        res.status(403).json({ error: 'Supervisors may only view business accounts' });
        return;
      }
      // Financial fields are never exposed to supervisors, even on a business record.
      delete (user as any).bankName;
      delete (user as any).accountNumber;
      delete (user as any).branchCode;
      delete (user as any).creditBalance;
    }

    res.json(user);
  } catch (err) {
    console.error('[User] getUserById error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// ── PUT update own profile ──────────────────────────────────────────────────
export const updateMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      fullName, phone, city, province, address,
      streetNumber, streetName, suburb, postalCode,
      height, clothingSize, shoeSize,
      bankName, accountNumber, branchCode,
      vatNumber, industry, website, contactName,
    } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(fullName      !== undefined && { fullName }),
        ...(phone         !== undefined && { phone }),
        ...(city          !== undefined && { city }),
        ...(province      !== undefined && { province }),
        ...(address       !== undefined && { address }),
        ...(streetNumber  !== undefined && { streetNumber }),
        ...(streetName    !== undefined && { streetName }),
        ...(suburb        !== undefined && { suburb }),
        ...(postalCode    !== undefined && { postalCode }),
        ...(height        !== undefined && { height: Number(height) || null }),
        ...(clothingSize  !== undefined && { clothingSize }),
        ...(shoeSize      !== undefined && { shoeSize }),
        ...(bankName      !== undefined && { bankName }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(branchCode    !== undefined && { branchCode }),
        ...(vatNumber     !== undefined && { vatNumber }),
        ...(industry      !== undefined && { industry }),
        ...(website       !== undefined && { website }),
        ...(contactName   !== undefined && { contactName }),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('[User] updateMyProfile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// ── POST upload documents (own account — /api/users/me/documents) ────────────
export const uploadDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const data = extractFileUrls(files);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const updated = await prisma.user.update({ where: { id: req.user!.id }, data });
    res.json({ message: 'Documents uploaded', urls: data, user: updated });
  } catch (err) {
    console.error('[User] uploadDocuments error:', err);
    res.status(500).json({ error: 'Failed to upload documents' });
  }
};

// FIX: POST upload documents by userId — /api/users/register-documents/:id
// Called by RegisterPage.tsx right after account creation with the fresh auth token.
// Allows uploading documents for a specific userId as long as the token owner matches
// (either the user themselves or an admin).
export const uploadDocumentsByUserId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = req.params.id;

    // Security: only allow the user themselves or an ADMIN to upload for a given userId
    if (req.user!.id !== targetId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id: targetId } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const data = extractFileUrls(files);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const updated = await prisma.user.update({ where: { id: targetId }, data });
    res.json({ message: 'Documents uploaded', urls: data, user: updated });
  } catch (err) {
    console.error('[User] uploadDocumentsByUserId error:', err);
    res.status(500).json({ error: 'Failed to upload documents' });
  }
};

// ── Admin: update user status / onboarding ──────────────────────────────────
export const adminUpdateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      status, onboardingStatus, rejectionReason,
      role, reliabilityScore, paymentStatus,
      fullName, phone, city,
    } = req.body;

    const isSupervisor = req.user?.role === 'SUPERVISOR';

    if (isSupervisor) {
      const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
      if (!target || target.role !== 'BUSINESS') {
        res.status(403).json({ error: 'Supervisors may only edit business accounts' });
        return;
      }
    }

    const data: any = {};

    if (status           !== undefined) data.status           = normaliseStatus(status);
    if (onboardingStatus !== undefined) data.onboardingStatus = normaliseStatus(onboardingStatus);
    if (rejectionReason  !== undefined) data.rejectionReason  = rejectionReason;
    if (fullName         !== undefined) data.fullName         = fullName;
    if (phone            !== undefined) data.phone            = phone;
    if (city             !== undefined) data.city             = city;

    // Role changes and anything payment/financial are admin-only — never
    // settable by a supervisor, even on a business record they can edit.
    if (!isSupervisor) {
      if (role             !== undefined) data.role             = (role as string).toUpperCase();
      if (reliabilityScore !== undefined) data.reliabilityScore = parseFloat(reliabilityScore);
      if (paymentStatus    !== undefined) data.paymentStatus    = paymentStatus;
    }

    const updated = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) {
    console.error('[User] adminUpdateUser error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// ── Admin: delete user ──────────────────────────────────────────────────────
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('[User] deleteUser error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// ── GET chatable users ───────────────────────────────────────────────────────
export const getChatableUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role   = req.user!.role;

    if (role === 'ADMIN') {
      const users = await prisma.user.findMany({
        where:   { role: { in: ['PROMOTER', 'BUSINESS'] }, NOT: { id: userId } },
        select:  { id: true, fullName: true, role: true, status: true },
        orderBy: { fullName: 'asc' },
      });
      res.json(users);
      return;
    }

    if (role === 'BUSINESS') {
      const [adminUser, shifts] = await Promise.all([
        prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, fullName: true, role: true, status: true } }),
        prisma.shift.findMany({ where: { job: { clientId: userId } }, select: { promoterId: true }, distinct: ['promoterId'] }),
      ]);
      const promoterIds = shifts.map(s => s.promoterId);
      const promoters = promoterIds.length > 0
        ? await prisma.user.findMany({ where: { id: { in: promoterIds } }, select: { id: true, fullName: true, role: true, status: true }, orderBy: { fullName: 'asc' } })
        : [];
      res.json([...(adminUser ? [adminUser] : []), ...promoters]);
      return;
    }

    if (role === 'PROMOTER') {
      const [adminUser, shifts] = await Promise.all([
        prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, fullName: true, role: true, status: true } }),
        prisma.shift.findMany({ where: { promoterId: userId }, select: { job: { select: { clientId: true } } }, distinct: ['jobId'] }),
      ]);
      const clientIds = [...new Set(shifts.map(s => s.job?.clientId).filter(Boolean) as string[])];
      const businesses = clientIds.length > 0
        ? await prisma.user.findMany({ where: { id: { in: clientIds }, role: 'BUSINESS' }, select: { id: true, fullName: true, role: true, status: true }, orderBy: { fullName: 'asc' } })
        : [];
      res.json([...(adminUser ? [adminUser] : []), ...businesses]);
      return;
    }

    res.json([]);
  } catch (err) {
    console.error('[User] getChatableUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch chattable users' });
  }
};

// ── Business: top up prepaid credit balance ─────────────────────────────────
// Simple direct top-up (no live payment gateway wired in yet) — adds the
// given amount (in whole Rands) to the business's credit balance, which is
// then drawn down automatically whenever they post a job.
export const topUpCredit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'BUSINESS') {
      res.status(403).json({ error: 'Only business accounts have a credit balance' });
      return;
    }

    const amount = parseInt(req.body?.amount, 10);
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'A positive top-up amount is required' });
      return;
    }
    if (amount > 10_000_000) {
      res.status(400).json({ error: 'Top-up amount exceeds the allowed limit' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { creditBalance: { increment: amount } },
      select: { id: true, creditBalance: true },
    });

    try {
      await auditLog({ userId: req.user.id, action: 'CREDIT_TOPUP', entity: 'User', entityId: req.user.id, meta: { amount } });
    } catch { /* non-fatal */ }

    res.json({ message: 'Credit added', creditBalance: user.creditBalance });
  } catch (err) {
    console.error('[User] topUpCredit error:', err);
    res.status(500).json({ error: 'Failed to top up credit' });
  }
};

// ── Business: full ledger of their credit balance — every top-up and every
//    campaign spend, newest first, plus the current balance. Powers the
//    Payroll tab's "where the money went" reporting (CSV/PDF export).
export const getMyCreditLedger = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'BUSINESS') {
      res.status(403).json({ error: 'Only business accounts have a credit balance' });
      return;
    }

    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { creditBalance: true },
    });

    const logs = await prisma.auditLog.findMany({
      where: {
        userId: req.user.id,
        action: { in: ['CREATE_JOB', 'CREDIT_TOPUP', 'CREDIT_REFUND'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Only CREATE_JOB entries that actually deducted credit are spend events.
    const spendLogs = logs.filter(l => l.action !== 'CREATE_JOB' || (l.meta as any)?.creditDeducted);
    const jobIds = spendLogs.filter(l => l.action === 'CREATE_JOB').map(l => l.entityId).filter(Boolean) as string[];
    const jobs = jobIds.length
      ? await prisma.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, title: true, client: true, brand: true } })
      : [];
    const jobById = new Map(jobs.map(j => [j.id, j]));

    const entries = spendLogs.map(l => {
      if (l.action === 'CREDIT_TOPUP') {
        return {
          id: l.id, type: 'topup' as const, createdAt: l.createdAt,
          amount: (l.meta as any)?.amount || 0,
          description: 'Balance top-up',
        };
      }
      if (l.action === 'CREDIT_REFUND') {
        return {
          id: l.id, type: 'refund' as const, createdAt: l.createdAt,
          amount: (l.meta as any)?.amount || 0,
          description: 'Refund — job creation failed',
        };
      }
      const job = l.entityId ? jobById.get(l.entityId) : undefined;
      return {
        id: l.id, type: 'spend' as const, createdAt: l.createdAt,
        amount: (l.meta as any)?.creditDeducted || 0,
        description: job ? `${job.title} — ${job.client || job.brand}` : 'Campaign booked',
        jobId: l.entityId || undefined,
      };
    });

    res.json({ creditBalance: me?.creditBalance ?? 0, entries });
  } catch (err) {
    console.error('[User] getMyCreditLedger error:', err);
    res.status(500).json({ error: 'Failed to fetch credit ledger' });
  }
};

// ── Eligible promoters for a job ────────────────────────────────────────────
export const getEligiblePromoters = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.query;
    const where: any = { role: 'PROMOTER' };

    const promoters = await prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, phone: true, city: true,
        province: true, gender: true, height: true, clothingSize: true,
        shoeSize: true, reliabilityScore: true, profilePhotoUrl: true,
        headshotUrl: true, fullBodyPhotoUrl: true, cvUrl: true,
        onboardingStatus: true, status: true, createdAt: true,
      },
      orderBy: { reliabilityScore: 'desc' },
    });

    if (jobId) {
      const allocated = await prisma.application.findMany({
        where: { jobId: jobId as string, status: 'ALLOCATED' },
        select: { promoterId: true },
      });
      const allocatedIds = new Set(allocated.map(a => a.promoterId));
      res.json(promoters.filter(p => !allocatedIds.has(p.id)));
      return;
    }

    res.json(promoters);
  } catch (err) {
    console.error('[User] getEligiblePromoters error:', err);
    res.status(500).json({ error: 'Failed to fetch promoters' });
  }
};