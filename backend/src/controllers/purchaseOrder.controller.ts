import { Response } from 'express';
import { prisma } from '../config';
import { AuthRequest } from '../middleware/auth';
import { auditLog } from '../utils/auditLogger';

// A CE "in flight" against a PO is one that hasn't been cancelled — both
// PENDING and APPROVED count against the running budget so admins can see
// how much of the PO is spoken for, not just what's already been signed off.
const ACTIVE_CE_STATUSES = ['pending', 'approved'];

function summarizePO(po: any) {
  const commitments = po.commitments || [];
  const committed = commitments
    .filter((c: any) => ACTIVE_CE_STATUSES.includes(c.status))
    .reduce((sum: number, c: any) => sum + c.amount, 0);
  const approved = commitments
    .filter((c: any) => c.status === 'approved')
    .reduce((sum: number, c: any) => sum + c.amount, 0);
  const pending = commitments
    .filter((c: any) => c.status === 'pending')
    .reduce((sum: number, c: any) => sum + c.amount, 0);
  const cancelled = commitments
    .filter((c: any) => c.status === 'cancelled')
    .reduce((sum: number, c: any) => sum + c.amount, 0);
  return {
    ...po,
    committedAmount: committed,
    approvedAmount: approved,
    pendingAmount: pending,
    cancelledAmount: cancelled,
    remainingAmount: po.amount - committed,
    percentCommitted: po.amount > 0 ? Math.round((committed / po.amount) * 1000) / 10 : 0,
  };
}

const PO_INCLUDE = {
  client: { select: { id: true, name: true, email: true, industry: true } },
  commitments: {
    include: { job: { select: { id: true, title: true, brand: true, venue: true, date: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
};

// ── Purchase Orders ───────────────────────────────────────────────────────────

export const getAllPurchaseOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId, status } = req.query;
    const pos = await prisma.purchaseOrder.findMany({
      where: {
        ...(clientId && { clientId: clientId as string }),
        ...(status && status !== 'all' && { status: status as string }),
      },
      include: PO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(pos.map(summarizePO));
  } catch (err) {
    console.error('[PurchaseOrder] getAllPurchaseOrders error:', err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

export const getPurchaseOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: PO_INCLUDE,
    });
    if (!po) { res.status(404).json({ error: 'Purchase order not found' }); return; }
    res.json(summarizePO(po));
  } catch (err) {
    console.error('[PurchaseOrder] getPurchaseOrderById error:', err);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
};

export const createPurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId, poNumber, amount, periodStart, periodEnd, description } = req.body;
    if (!clientId || !poNumber || !amount || !periodStart || !periodEnd) {
      res.status(400).json({ error: 'clientId, poNumber, amount, periodStart and periodEnd are required' });
      return;
    }
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

    const po = await prisma.purchaseOrder.create({
      data: {
        clientId,
        poNumber,
        amount: parseInt(amount, 10),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        description: description || null,
        createdBy: req.user!.id,
      },
      include: PO_INCLUDE,
    });

    await auditLog({ userId: req.user!.id, action: 'CREATE_PURCHASE_ORDER', entity: 'PurchaseOrder', entityId: po.id, meta: { amount: po.amount, clientId } });
    res.status(201).json(summarizePO(po));
  } catch (err) {
    console.error('[PurchaseOrder] createPurchaseOrder error:', err);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
};

export const updatePurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'Purchase order not found' }); return; }

    const { poNumber, amount, periodStart, periodEnd, description, status } = req.body;
    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        ...(poNumber !== undefined && { poNumber }),
        ...(amount !== undefined && { amount: parseInt(amount, 10) }),
        ...(periodStart !== undefined && { periodStart: new Date(periodStart) }),
        ...(periodEnd !== undefined && { periodEnd: new Date(periodEnd) }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
      include: PO_INCLUDE,
    });

    await auditLog({ userId: req.user!.id, action: 'UPDATE_PURCHASE_ORDER', entity: 'PurchaseOrder', entityId: po.id, meta: { status } });
    res.json(summarizePO(po));
  } catch (err) {
    console.error('[PurchaseOrder] updatePurchaseOrder error:', err);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
};

// ── Commitment Entries (CEs) ──────────────────────────────────────────────────

export const getAllCommitments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { purchaseOrderId, jobId, status, clientId } = req.query;
    const entries = await prisma.commitmentEntry.findMany({
      where: {
        ...(purchaseOrderId && { purchaseOrderId: purchaseOrderId as string }),
        ...(jobId && { jobId: jobId as string }),
        ...(status && status !== 'all' && { status: status as string }),
        ...(clientId && { purchaseOrder: { clientId: clientId as string } }),
      },
      include: {
        purchaseOrder: { include: { client: { select: { id: true, name: true } } } },
        job: { select: { id: true, title: true, brand: true, venue: true, date: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(entries);
  } catch (err) {
    console.error('[PurchaseOrder] getAllCommitments error:', err);
    res.status(500).json({ error: 'Failed to fetch commitment entries' });
  }
};

// Release a CE against a PO for a job — this is the "book spend" action.
// By default, over-committing beyond the PO's remaining budget is blocked;
// pass allowOverride=true to release it anyway (e.g. client verbally approved
// an overage pending a PO amendment).
export const createCommitment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { purchaseOrderId, jobId, ceNumber, amount, notes, allowOverride } = req.body;
    if (!purchaseOrderId || !amount) {
      res.status(400).json({ error: 'purchaseOrderId and amount are required' });
      return;
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { commitments: true },
    });
    if (!po) { res.status(404).json({ error: 'Purchase order not found' }); return; }
    if (po.status !== 'active') { res.status(400).json({ error: `Purchase order is ${po.status}, not active` }); return; }

    const requested = parseInt(amount, 10);
    const alreadyCommitted = po.commitments
      .filter(c => ACTIVE_CE_STATUSES.includes(c.status))
      .reduce((sum, c) => sum + c.amount, 0);
    const remaining = po.amount - alreadyCommitted;

    if (requested > remaining && !allowOverride) {
      res.status(400).json({
        error: `This CE (R${requested.toLocaleString()}) would exceed the PO's remaining budget of R${remaining.toLocaleString()}.`,
        remaining,
        requested,
        overBudget: true,
      });
      return;
    }

    if (jobId) {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    }

    const ce = await prisma.commitmentEntry.create({
      data: {
        purchaseOrderId,
        jobId: jobId || null,
        ceNumber: ceNumber || null,
        amount: requested,
        notes: notes || null,
        createdBy: req.user!.id,
      },
      include: {
        purchaseOrder: { include: { client: { select: { id: true, name: true } } } },
        job: { select: { id: true, title: true, brand: true, venue: true, date: true } },
      },
    });

    await auditLog({ userId: req.user!.id, action: 'CREATE_COMMITMENT_ENTRY', entity: 'CommitmentEntry', entityId: ce.id, meta: { purchaseOrderId, amount: requested, jobId } });
    res.status(201).json(ce);
  } catch (err) {
    console.error('[PurchaseOrder] createCommitment error:', err);
    res.status(500).json({ error: 'Failed to create commitment entry' });
  }
};

export const updateCommitment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.commitmentEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'Commitment entry not found' }); return; }

    const { status, amount, notes, ceNumber } = req.body;
    const data: any = {
      ...(amount !== undefined && { amount: parseInt(amount, 10) }),
      ...(notes !== undefined && { notes }),
      ...(ceNumber !== undefined && { ceNumber }),
    };

    if (status !== undefined) {
      data.status = status;
      if (status === 'approved') {
        data.approvedBy = req.user!.id;
        data.approvedAt = new Date();
      }
      if (status === 'cancelled') {
        data.approvedBy = null;
        data.approvedAt = null;
      }
    }

    const ce = await prisma.commitmentEntry.update({
      where: { id: req.params.id },
      data,
      include: {
        purchaseOrder: { include: { client: { select: { id: true, name: true } } } },
        job: { select: { id: true, title: true, brand: true, venue: true, date: true } },
      },
    });

    await auditLog({ userId: req.user!.id, action: `COMMITMENT_ENTRY_${(status || 'UPDATED').toUpperCase()}`, entity: 'CommitmentEntry', entityId: ce.id });
    res.json(ce);
  } catch (err) {
    console.error('[PurchaseOrder] updateCommitment error:', err);
    res.status(500).json({ error: 'Failed to update commitment entry' });
  }
};
