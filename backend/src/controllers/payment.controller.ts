import { Request, Response } from 'express';
import { prisma } from '../config';
import { AuthRequest } from '../middleware/auth';
import { auditLog } from '../utils/auditLogger';

// ── GET promoter's own payments ─────────────────────────────────────────────
export const getMyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await prisma.payment.findMany({
      where: { promoterId: req.user!.id },
      include: {
        shift: {
          include: {
            job: { select: { title: true, client: true, date: true, hourlyRate: true, venue: true } },
          },
        },
      },
      orderBy: { shift: { checkOutTime: 'desc' } },
    });
    res.json(payments);
  } catch {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// ── GET payments for jobs belonging to the requesting business ───────────────
export const getBusinessPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const businessJobs = await prisma.job.findMany({
      where:  { clientId: userId },
      select: { id: true },
    });
    const jobIds = businessJobs.map(j => j.id);

    const payments = await prisma.payment.findMany({
      where: { shift: { jobId: { in: jobIds } } },
      include: {
        promoter: {
          select: {
            id: true, fullName: true, email: true,
            bankName: true, accountNumber: true, branchCode: true,
            phone: true,
          },
        },
        shift: {
          include: {
            job: { select: { title: true, client: true, date: true, hourlyRate: true } },
          },
        },
      },
      orderBy: { shift: { checkOutTime: 'desc' } },
    });

    res.json(payments);
  } catch (err) {
    console.error('[Payment] getBusinessPayments error:', err);
    res.status(500).json({ error: 'Failed to fetch business payments' });
  }
};

// ── PUT mark a payment as paid (business action) ─────────────────────────────
// Business marks that they have transferred the money to the promoter.
// This sets status → PAID and records who marked it and when.
export const markAsPaid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reference } = req.body;  // optional payment reference / EFT ref
    const payment = await prisma.payment.findUnique({
      where:   { id: req.params.id },
      include: { shift: { include: { job: { select: { clientId: true } } } } },
    });

    if (!payment) { res.status(404).json({ error: 'Payment not found' }); return; }

    // Only the business that owns the job can mark it paid
    const role = req.user!.role;
    if (role !== 'ADMIN' && payment.shift?.job?.clientId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorised to mark this payment as paid' });
      return;
    }

    // Only APPROVED or PENDING payments can be marked paid
    if (!['PENDING', 'APPROVED'].includes(payment.status)) {
      res.status(400).json({ error: `Payment is already ${payment.status}` });
      return;
    }

    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status:    'PAID',
        paidAt:    new Date(),
        approvedBy: req.user!.id,
        ...(reference && { reference }),
      },
    });

    await auditLog({
      userId:   req.user!.id,
      action:   'MARK_PAID',
      entity:   'Payment',
      entityId: payment.id,
      meta:     { promoterId: payment.promoterId, amount: payment.netAmount, reference },
    });

    res.json(updated);
  } catch (err) {
    console.error('[Payment] markAsPaid error:', err);
    res.status(500).json({ error: 'Failed to mark payment as paid' });
  }
};

// ── GET all payments (admin only) ───────────────────────────────────────────
export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const payments = await prisma.payment.findMany({
      where: { ...(status && { status: status as any }) },
      include: {
        promoter: {
          select: {
            id: true, fullName: true, email: true, phone: true,
            bankName: true, accountNumber: true, branchCode: true,
          },
        },
        shift: {
          include: {
            job: { select: { id: true, title: true, client: true, date: true, hourlyRate: true, clientId: true } },
          },
        },
      },
      orderBy: { shift: { checkOutTime: 'desc' } },
    });
    res.json(payments);
  } catch {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// ── POST auto-create payment for shift on checkout ──────────────────────────
export const createPaymentForShift = async (
  shiftId:     string,
  promoterId:  string,
  hoursWorked: number,
  hourlyRate:  number,
): Promise<void> => {
  try {
    const existing = await prisma.payment.findUnique({ where: { shiftId } });
    if (existing) return;

    const grossAmount = Math.round(hoursWorked * hourlyRate * 100) / 100;

    await prisma.payment.create({
      data: {
        shiftId,
        promoterId,
        grossAmount: Math.round(grossAmount),
        deductions:  0,
        netAmount:   Math.round(grossAmount),
        status:      'PENDING',
      },
    });
  } catch (err) {
    console.error('[Payment] createPaymentForShift error:', err);
  }
};

// ── PUT approve a payment (admin only) ─────────────────────────────────────
export const approvePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deductions } = req.body;
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) { res.status(404).json({ error: 'Payment not found' }); return; }

    const netAmount = payment.grossAmount - (deductions ?? payment.deductions);

    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status:     'APPROVED',
        deductions: deductions ?? payment.deductions,
        netAmount,
        approvedBy: req.user!.id,
      },
    });

    await auditLog({
      userId: req.user!.id, action: 'APPROVE_PAYMENT',
      entity: 'Payment', entityId: payment.id,
      meta:   { netAmount, deductions },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to approve payment' });
  }
};

// ── POST batch mark payments as paid (admin) ────────────────────────────────
export const batchPay = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentIds } = req.body as { paymentIds: string[] };

    const result = await prisma.payment.updateMany({
      where: { id: { in: paymentIds }, status: { in: ['APPROVED', 'PENDING'] } },
      data:  { status: 'PAID', paidAt: new Date(), reference: `BATCH-${Date.now()}` },
    });

    await auditLog({
      userId: req.user!.id, action: 'BATCH_PAY',
      entity: 'Payment', meta: { count: result.count, paymentIds },
    });

    res.json({ message: `${result.count} payments marked as paid` });
  } catch {
    res.status(500).json({ error: 'Batch pay failed' });
  }
};

// ── GET payment summary totals (admin) ─────────────────────────────────────
export const getPaymentSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [pending, approved, paid] = await Promise.all([
      prisma.payment.aggregate({ where: { status: 'PENDING' },  _sum: { netAmount: true }, _count: true }),
      prisma.payment.aggregate({ where: { status: 'APPROVED' }, _sum: { netAmount: true }, _count: true }),
      prisma.payment.aggregate({ where: { status: 'PAID' },     _sum: { netAmount: true }, _count: true }),
    ]);
    res.json({
      pending:  { count: pending._count,  total: pending._sum.netAmount  ?? 0 },
      approved: { count: approved._count, total: approved._sum.netAmount ?? 0 },
      paid:     { count: paid._count,     total: paid._sum.netAmount     ?? 0 },
    });
  } catch {
    res.status(500).json({ error: 'Failed to get payment summary' });
  }
};