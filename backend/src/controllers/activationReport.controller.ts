import { Response } from 'express';
import { prisma } from '../config';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { auditLog } from '../utils/auditLogger';
import { uploadToSupabaseStorage } from '../utils/supabaseStorage';

// ── Multer setup for activation-shot uploads ─────────────────────────────────
// Files are held in memory just long enough to forward to Supabase Storage —
// nothing is written to local disk, since Render's filesystem doesn't persist
// across restarts/redeploys.
const storage = multer.memoryStorage();

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

// ── Promoter/supervisor/business/admin: fetch the current report for a job ──
export const getReportForJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    // Only the ADMIN, the job's client (BUSINESS), the assigned SUPERVISOR,
    // or a PROMOTER who worked a shift on this job, may view its report.
    if (req.user!.role !== 'ADMIN') {
      const isOwningBusiness   = req.user!.role === 'BUSINESS'   && job.clientId === req.user!.id;
      const isAssignedSupervisor = req.user!.role === 'SUPERVISOR' && job.supervisorId === req.user!.id;
      if (!isOwningBusiness && !isAssignedSupervisor) {
        const hasShift = await prisma.shift.findFirst({ where: { jobId, promoterId: req.user!.id } });
        if (!hasShift) { res.status(403).json({ error: 'You are not authorised to view this activation report' }); return; }
      }
    }

    const report = await prisma.activationReport.findUnique({
      where: { jobId },
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

    // Only the ADMIN, the SUPERVISOR assigned to this job, or a PROMOTER who
    // actually worked a shift on this job, may file/update its activation report.
    if (req.user!.role !== 'ADMIN') {
      const isAssignedSupervisor = req.user!.role === 'SUPERVISOR' && job.supervisorId === req.user!.id;
      if (!isAssignedSupervisor) {
        const hasShift = await prisma.shift.findFirst({
          where: { jobId, promoterId: req.user!.id },
        });
        if (!hasShift) { res.status(403).json({ error: 'You are not assigned to this activation' }); return; }
      }
    }

    const files = (req.files as { [field: string]: Express.Multer.File[] }) || {};

    // Upload any provided shots to Supabase Storage in parallel; each is
    // undefined if that shot wasn't included in this request.
    const [shotSetupUrl, shotMidEventUrl, shotCloseUrl] = await Promise.all([
      files.shotSetup?.[0]
        ? uploadToSupabaseStorage(files.shotSetup[0].buffer, files.shotSetup[0].originalname, files.shotSetup[0].mimetype)
        : Promise.resolve(undefined),
      files.shotMidEvent?.[0]
        ? uploadToSupabaseStorage(files.shotMidEvent[0].buffer, files.shotMidEvent[0].originalname, files.shotMidEvent[0].mimetype)
        : Promise.resolve(undefined),
      files.shotClose?.[0]
        ? uploadToSupabaseStorage(files.shotClose[0].buffer, files.shotClose[0].originalname, files.shotClose[0].mimetype)
        : Promise.resolve(undefined),
    ]);

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

// ── Campaign success/failure classification ──────────────────────────────────
// Policy (adjust to match the actual business definition of "successful"):
//   - "successful": a report was submitted AND it recorded at least one
//     unit served or conversion.
//   - "failed": the activation finished (COMPLETED/CANCELLED) but no report
//     was submitted, or a report was submitted with zero served/conversions.
//   - "pending": the activation hasn't happened / finished yet.
export type CampaignOutcome = 'successful' | 'failed' | 'pending';

function classifyActivation(job: { status: string }, report: any): CampaignOutcome {
  if (report?.status === 'submitted') {
    return (report.unitsServed > 0 || report.conversions > 0) ? 'successful' : 'failed';
  }
  if (['COMPLETED', 'CANCELLED'].includes(job.status)) return 'failed';
  return 'pending';
}

// ── Admin/Business: campaign insights — counts of successful vs failed vs
// pending activations, plus totals. Business users are scoped to their own
// jobs (clientId === their user id, same convention used across the app);
// admins may optionally pass ?clientId= to scope to one CRM client.
export const getCampaignInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.user!.role;
    const { dateFrom, dateTo } = req.query;
    const where: any = {};

    if (role === 'BUSINESS') {
      where.clientId = req.user!.id;
    } else if (role === 'ADMIN' && req.query.clientId) {
      where.clientId = req.query.clientId as string;
    }
    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom && { gte: new Date(dateFrom as string) }),
        ...(dateTo && { lte: new Date(dateTo as string) }),
      };
    }

    const jobs = await prisma.job.findMany({
      where,
      include: { activationReport: true },
      orderBy: { date: 'desc' },
    });

    const activations = jobs.map(j => ({
      jobId: j.id,
      title: j.title,
      brand: j.brand,
      client: j.client,
      date: j.date,
      status: j.status,
      outcome: classifyActivation(j, (j as any).activationReport),
      unitsServed: (j as any).activationReport?.unitsServed ?? 0,
      conversions: (j as any).activationReport?.conversions ?? 0,
    }));

    const counts = activations.reduce(
      (acc, a) => {
        acc[a.outcome] += 1;
        return acc;
      },
      { successful: 0, failed: 0, pending: 0 } as Record<CampaignOutcome, number>,
    );

    res.json({
      totalActivations: activations.length,
      successful: counts.successful,
      failed: counts.failed,
      pending: counts.pending,
      successRate: activations.length > 0 ? Math.round((counts.successful / activations.length) * 1000) / 10 : 0,
      activations,
    });
  } catch (err) {
    console.error('[ActivationReport] getCampaignInsights error:', err);
    res.status(500).json({ error: 'Failed to build campaign insights' });
  }
};

// ── Business: self-serve version of the admin client report, scoped to the
// requesting business's own jobs — number of activations, serves/conversions,
// insights, feedback and the 3-shot image set per activation, ready to hand
// straight to the client without an admin having to pull it for them.
export const getMyClientReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;
    const jobs = await prisma.job.findMany({
      where: {
        clientId: req.user!.id,
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
      outcome: classifyActivation(j, (j as any).activationReport),
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
      totalActivations: activations.length,
      reportsSubmitted: totals.reportsSubmitted,
      totalServed: totals.totalServed,
      totalConversions: totals.totalConversions,
      activations,
    });
  } catch (err) {
    console.error('[ActivationReport] getMyClientReport error:', err);
    res.status(500).json({ error: 'Failed to build your activation report' });
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
      outcome: classifyActivation(j, (j as any).activationReport),
      report: (j as any).activationReport || null,
    }));

    const totals = activations.reduce(
      (acc, a) => {
        if (a.report) {
          acc.totalServed += a.report.unitsServed || 0;
          acc.totalConversions += a.report.conversions || 0;
          if (a.report.status === 'submitted') acc.reportsSubmitted += 1;
        }
        acc.outcomes[a.outcome] += 1;
        return acc;
      },
      { totalServed: 0, totalConversions: 0, reportsSubmitted: 0, outcomes: { successful: 0, failed: 0, pending: 0 } as Record<CampaignOutcome, number> },
    );

    res.json({
      client,
      totalActivations: activations.length,
      reportsSubmitted: totals.reportsSubmitted,
      totalServed: totals.totalServed,
      totalConversions: totals.totalConversions,
      outcomes: totals.outcomes,
      activations,
    });
  } catch (err) {
    console.error('[ActivationReport] getClientReport error:', err);
    res.status(500).json({ error: 'Failed to build client report' });
  }
};