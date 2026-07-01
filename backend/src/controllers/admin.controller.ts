import { Request, Response } from 'express';
import { prisma } from '../config';
import { AuthRequest } from '../middleware/auth';
import { auditLog } from '../utils/auditLogger';


export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalPromoters,
      pendingReview,
      activeJobs,
      totalShiftsToday,
      pendingPayments,
      totalClients,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'PROMOTER', status: 'approved' } }),
      prisma.user.count({ where: { status: 'pending_review' } }),
      prisma.job.count({ where: { status: { in: ['OPEN', 'FILLED', 'IN_PROGRESS'] } } }),
      prisma.shift.count({
        where: {
          status: 'CHECKED_IN',
          checkInTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.client.count(),
    ]);

    res.json({
      totalPromoters,
      pendingReview,
      activeJobs,
      totalShiftsToday,
      pendingPayments,
      totalClients,
    });
  } catch (err) {
    console.error('[Admin] getDashboardStats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};


export const getPendingRegistrations = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Return ALL promoters and businesses — not just pending — so the admin
    // registrations tab shows the full history (pending, approved, rejected)
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['PROMOTER', 'BUSINESS'] },
      },
      select: {
        id: true, fullName: true, email: true, phone: true, city: true,
        role: true, status: true, onboardingStatus: true,
        headshotUrl: true, fullBodyPhotoUrl: true, profilePhotoUrl: true, cvUrl: true,
        consentPopia: true, createdAt: true, industry: true, contactName: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    console.error('[Admin] getPendingRegistrations error:', err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
};


export const approveUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { decision, rejectionReason } = req.body; // decision: 'approved' | 'rejected' | 'blacklisted'

    // FIX: Guard against non-existent user IDs (e.g. R001, R002) to avoid Prisma throwing
    // a P2025 "Record not found" error which surfaced as a 500.
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        status: decision,
        onboardingStatus: decision,
        ...(rejectionReason && { rejectionReason }),
      },
    });

    await auditLog({
      userId: req.user!.id,
      action: `USER_${decision.toUpperCase()}`,
      entity: 'User',
      entityId: user.id,
      meta: { rejectionReason },
    });

    res.json({ message: `User ${decision}`, user });
  } catch (err) {
    console.error('[Admin] approveUser error:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};


export const updateReliabilityScore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { score } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { reliabilityScore: parseFloat(score) },
    });
    res.json(user);
  } catch (err) {
    console.error('[Admin] updateReliabilityScore error:', err);
    res.status(500).json({ error: 'Failed to update reliability score' });
  }
};


export const getAllClients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({ orderBy: { registeredDate: 'desc' } });
    res.json(clients);
  } catch (err) {
    console.error('[Admin] getAllClients error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

export const createClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const client = await prisma.client.create({ data: req.body });
    await auditLog({ userId: req.user!.id, action: 'CREATE_CLIENT', entity: 'Client', entityId: client.id });
    res.status(201).json(client);
  } catch (err) {
    console.error('[Admin] createClient error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
};

export const updateClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    const client = await prisma.client.update({ where: { id: req.params.id }, data: req.body });
    res.json(client);
  } catch (err) {
    console.error('[Admin] updateClient error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
};


export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, entity, limit = '100' } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(userId && { userId: userId as string }),
        ...(entity && { entity: entity as string }),
      },
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
    });
    res.json(logs);
  } catch (err) {
    console.error('[Admin] getAuditLogs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};