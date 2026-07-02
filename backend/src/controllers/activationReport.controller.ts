import { Response } from 'express';
import { prisma } from '../config';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { auditLog } from '../utils/auditLogger';

// ── Multer setup for activation-shot uploads ─────────────────────────────────
const uploadDir = path.join(process.cwd(), 'uploads', 'activation-shots');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const activationShotUpload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).fields([
  { name: 'shotSetup', maxCount: 1 },
  { name: 'shotMidEvent', maxCount: 1 },
  { name: 'shotClose', maxCount: 1 },
]);

const REPORT_INCLUDE = {
  job: {
    select: {
      id: true, title: true, client: true, clientId: true, brand: true,
      venue: true, city: true, date: true, status: true,
    },
  },
  reporter: { select: { id: true, fullName: true, email: true } },
} as const;

// ── Promoter/supervisor: fetch the current report for a job ─────────────────
export const getReportForJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await prisma.activationReport.findUnique({
      where: { jobId: req.params.jobId },
      include: REPORT_INCLUDE,
    });
    if (!report) { res.status(404).json({ error: 'No activation report yet for this job' }); return; }
    res.json(report);
  } catch (err) {
    console.error('[ActivationReport] getReportForJob error:', err);
    res.status(500).json({ error: 'Failed to fetch activation report' });
  }
};

// ── Promoter/supervisor: create or update the report for a job ──────────────
export const saveReportForJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { unitsServed, conversions, insights, feedback, status } = req.body;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    // Only the ADMIN, or a PROMOTER who actually worked a shift on this job,
    // may file/update its activation report.
    if (req.user!.role !== 'ADMIN') {
      const hasShift = await prisma.shift.findFirst({
        where: { jobId, promoterId: req.user!.id },
      });
      if (!hasShift) { res.status(403).json({ error: 'You are not assigned to this activation' }); return; }
    }

    const files = (req.files as { [field: string]: Express.Multer.File[] }) || {};
    const shotSetupUrl    = files.shotSetup?.[0]    ? `/uploads/activation-shots/${files.shotSetup[0].filename}`    : undefined;
    const shotMidEventUrl = files.shotMidEvent?.[0] ? `/uploads/activation-shots/${files.shotMidEvent[0].filename}` : undefined;
    const shotCloseUrl    = files.shotClose?.[0]    ? `/uploads/activation-shots/${files.shotClose[0].filename}`    : undefined;

    const reportStatus = status === 'submitted' ? 'submitted' : 'draft';

    // Require all three shots before allowing final submission
    if (reportStatus === 'submitted') {
      const existing = await prisma.activationReport.findUnique({ where: { jobId } });
      const finalSetup    = shotSetupUrl    ?? existing?.shotSetupUrl;
      const finalMid      = shotMidEventUrl ?? existing?.shotMidEventUrl;
      const finalClose    = shotCloseUrl    ?? existing?.shotCloseUrl;
      if (!finalSetup || !finalMid || !finalClose) {
        res.status(400).json({ error: 'All three shots (setup, mid-event, close-out) are required before submitting.' });
        return;
      }
    }

    const data: any = {
      unitsServed: unitsServed !== undefined ? parseInt(unitsServed, 10) || 0 : undefined,
      conversions: conversions !== undefined ? parseInt(conversions, 10) || 0 : undefined,
      insights: insights ?? undefined,
      feedback: feedback ?? undefined,
      status: reportStatus,
      ...(shotSetupUrl    && { shotSetupUrl }),
      ...(shotMidEventUrl && { shotMidEventUrl }),
      ...(shotCloseUrl    && { shotCloseUrl }),
      ...(reportStatus === 'submitted' && { submittedAt: new Date() }),
    };

    const report = await prisma.activationReport.upsert({
      where: { jobId },
      create: {
        jobId,
        submittedBy: req.user!.id,
        unitsServed: data.unitsServed ?? 0,
        conversions: data.conversions ?? 0,
        insights: data.insights ?? null,
        feedback: data.feedback ?? null,
        shotSetupUrl: shotSetupUrl ?? null,
        shotMidEventUrl: shotMidEventUrl ?? null,
        shotCloseUrl: shotCloseUrl ?? null,
        status: reportStatus,
        submittedAt: reportStatus === 'submitted' ? new Date() : null,
      },
      update: data,
      include: REPORT_INCLUDE,
    });

    res.json(report);
  } catch (err) {
    console.error('[ActivationReport] saveReportForJob error:', err);
    res.status(500).json({ error: 'Failed to save activation report' });
  }
};

// ── Admin: every submitted/draft report across all activations ──────────────
export const getAllReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, clientId, jobId, dateFrom, dateTo } = req.query;

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (jobId) where.jobId = jobId;
    if (clientId || dateFrom || dateTo) {
      let clientName: string | undefined;
      if (clientId) {
        const c = await prisma.client.findUnique({ where: { id: clientId as string } });
        clientName = c?.name;
      }
      where.job = {
        ...(clientId && {
          OR: [
            { clientId: clientId as string },
            ...(clientName ? [{ client: { equals: clientName, mode: 'insensitive' as const } }] : []),
          ],
        }),
        ...((dateFrom || dateTo) && {
          date: {
            ...(dateFrom && { gte: new Date(dateFrom as string) }),
            ...(dateTo && { lte: new Date(dateTo as string) }),
          },
        }),
      };
    }

    const reports = await prisma.activationReport.findMany({
      where,
      include: REPORT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(reports);
  } catch (err) {
    console.error('[ActivationReport] getAllReports error:', err);
    res.status(500).json({ error: 'Failed to fetch activation reports' });
  }
};

// ── Admin: auto-generated client report — activation count + totals + detail ─
export const getClientReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId, dateFrom, dateTo } = req.query;
    if (!clientId) { res.status(400).json({ error: 'clientId is required' }); return; }

    const client = await prisma.client.findUnique({ where: { id: clientId as string } });
    if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          { clientId: clientId as string },
          { client: { equals: client.name, mode: 'insensitive' } },
        ],
        ...((dateFrom || dateTo) && {
          date: {
            ...(dateFrom && { gte: new Date(dateFrom as string) }),
            ...(dateTo && { lte: new Date(dateTo as string) }),
          },
        }),
      },
      include: {
        activationReport: {
          include: { reporter: { select: { id: true, fullName: true, email: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    const activations = jobs.map(j => ({
      jobId: j.id,
      title: j.title,
      brand: j.brand,
      venue: j.venue,
      city: j.city,
      date: j.date,
      status: j.status,
      report: (j as any).activationReport || null,
    }));

    const totals = activations.reduce(
      (acc, a) => {
        if (a.report) {
          acc.totalServed += a.report.unitsServed || 0;
          acc.totalConversions += a.report.conversions || 0;
          if (a.report.status === 'submitted') acc.reportsSubmitted += 1;
        }
        return acc;
      },
      { totalServed: 0, totalConversions: 0, reportsSubmitted: 0 },
    );

    res.json({
      client,
      totalActivations: activations.length,
      reportsSubmitted: totals.reportsSubmitted,
      totalServed: totals.totalServed,
      totalConversions: totals.totalConversions,
      activations,
    });
  } catch (err) {
    console.error('[ActivationReport] getClientReport error:', err);
    res.status(500).json({ error: 'Failed to build client report' });
  }
};
