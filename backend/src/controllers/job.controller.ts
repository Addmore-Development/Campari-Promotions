import { Request, Response } from 'express';
import { prisma } from '../config';
import { AuthRequest } from '../middleware/auth';
import { auditLog } from '../utils/auditLogger';

export const getAllJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const userRole = req.user?.role;
    const userId   = req.user?.id;

    // ── ADMIN: see everything ────────────────────────────────────────────────
    if (!userRole || userRole === 'ADMIN') {
      const where: any = {};
      if (status && status !== 'all') {
        where.status = (status as string).toUpperCase();
      }
      const jobs = await prisma.job.findMany({
        where,
        include: {
          supervisor: { select: { id: true, fullName: true, email: true, phone: true } },
          applications: {
            include: {
              promoter: {
                select: {
                  id: true, fullName: true, profilePhotoUrl: true, headshotUrl: true,
                  fullBodyPhotoUrl: true, city: true, reliabilityScore: true, height: true,
                  gender: true, clothingSize: true, shoeSize: true, phone: true, email: true,
                  province: true, cvUrl: true, status: true, onboardingStatus: true, createdAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(jobs);
      return;
    }

    // ── BUSINESS: show only their jobs ───────────────────────────────────────
    if (userRole === 'BUSINESS') {
      const bizUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, email: true },
      });

      // Build every possible OR condition to catch jobs regardless of how they were linked
      const orConditions: any[] = [];

      // 1. clientId matches this user's ID (most reliable — set when admin picks from dropdown)
      orConditions.push({ clientId: userId });

      // 2. client field is an exact match to fullName
      if (bizUser?.fullName) {
        orConditions.push({ client: { equals: bizUser.fullName, mode: 'insensitive' as const } });
        orConditions.push({ brand:  { equals: bizUser.fullName, mode: 'insensitive' as const } });
      }

      // 3. client field contains fullName (partial — covers truncated display values)
      if (bizUser?.fullName) {
        orConditions.push({ client: { contains: bizUser.fullName, mode: 'insensitive' as const } });
        orConditions.push({ brand:  { contains: bizUser.fullName, mode: 'insensitive' as const } });
      }

      // 4. client field contains the user's ID string directly
      orConditions.push({ client: { contains: userId!, mode: 'insensitive' as const } });

      // 5. client field contains a portion of their name (in case fullName has extra spaces/chars)
      if (bizUser?.fullName) {
        const nameParts = bizUser.fullName.trim().split(/\s+/).filter(p => p.length > 3);
        for (const part of nameParts) {
          orConditions.push({ client: { contains: part, mode: 'insensitive' as const } });
        }
      }

      const statusWhere: any = {};
      if (status && status !== 'all') {
        statusWhere.status = (status as string).toUpperCase();
      }

      const jobs = await prisma.job.findMany({
        where: {
          ...statusWhere,
          OR: orConditions,
        },
        include: {
          supervisor: { select: { id: true, fullName: true, email: true, phone: true } },
          applications: {
            include: {
              promoter: {
                select: {
                  id: true, fullName: true, profilePhotoUrl: true, headshotUrl: true,
                  fullBodyPhotoUrl: true, city: true, reliabilityScore: true, height: true,
                  gender: true, clothingSize: true, shoeSize: true, phone: true, email: true,
                  province: true, cvUrl: true, status: true, onboardingStatus: true, createdAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(jobs);
      return;
    }

    // ── SUPERVISOR: see every campaign/job across all clients (read-only —
    //    no hourly rate, mirrors the admin view minus financials) ───────────
    if (userRole === 'SUPERVISOR') {
      const where: any = {};
      if (status && status !== 'all') {
        where.status = (status as string).toUpperCase();
      }
      const jobs = await prisma.job.findMany({
        where,
        include: {
          supervisor: { select: { id: true, fullName: true, email: true, phone: true } },
          shifts: {
            include: {
              promoter: {
                select: { id: true, fullName: true, phone: true, email: true, profilePhotoUrl: true, headshotUrl: true },
              },
            },
          },
          applications: {
            include: {
              promoter: {
                select: {
                  id: true, fullName: true, profilePhotoUrl: true, headshotUrl: true,
                  fullBodyPhotoUrl: true, city: true, reliabilityScore: true, height: true,
                  gender: true, clothingSize: true, shoeSize: true, phone: true, email: true,
                  province: true, cvUrl: true, status: true, onboardingStatus: true, createdAt: true,
                },
              },
            },
          },
          activationReport: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Supervisors don't see the financial side — strip pay rate from the response.
      const sanitised = jobs.map(({ hourlyRate, ...rest }) => rest);
      res.json(sanitised);
      return;
    }

    // ── PROMOTER: open/active jobs only ──────────────────────────────────────
    if (userRole === 'PROMOTER') {
      const where: any = {};
      if (status && status !== 'all') {
        where.status = (status as string).toUpperCase();
      } else {
        where.status = { in: ['OPEN', 'FILLED', 'IN_PROGRESS'] };
      }
      const jobs = await prisma.job.findMany({
        where,
        include: {
          supervisor: { select: { id: true, fullName: true, email: true, phone: true } },
          applications: {
            include: {
              promoter: {
                select: {
                  id: true, fullName: true, profilePhotoUrl: true, headshotUrl: true,
                  fullBodyPhotoUrl: true, city: true, reliabilityScore: true, height: true,
                  gender: true, clothingSize: true, shoeSize: true, phone: true, email: true,
                  province: true, cvUrl: true, status: true, onboardingStatus: true, createdAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(jobs);
      return;
    }

    // ── Fallback: return empty ───────────────────────────────────────────────
    res.json([]);
  } catch (err) {
    console.error('[Job] getAllJobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

export const getJobById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        supervisor: { select: { id: true, fullName: true, email: true, phone: true } },
        applications: {
          include: {
            promoter: {
              select: {
                id: true, fullName: true, profilePhotoUrl: true, headshotUrl: true,
                fullBodyPhotoUrl: true, city: true, reliabilityScore: true, height: true,
                gender: true, clothingSize: true, shoeSize: true, phone: true, email: true,
                province: true, cvUrl: true, status: true, onboardingStatus: true, createdAt: true,
              },
            },
          },
        },
      },
    });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    res.json(job);
  } catch {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
};

export const getMyJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobs = await prisma.job.findMany({
      where: { createdBy: req.user!.id },
      include: { applications: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(jobs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

/**
 * GET /api/jobs/supervisor
 * Dedicated endpoint for supervisor users — returns every job/activation
 * they've been assigned to oversee, so they can pull shifts, file the
 * activation report, and chat with the promoters/client on that job.
 */
export const getSupervisorJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const jobs = await prisma.job.findMany({
      where: { supervisorId: userId },
      include: {
        shifts: {
          include: {
            promoter: {
              select: { id: true, fullName: true, phone: true, email: true, profilePhotoUrl: true, headshotUrl: true },
            },
          },
        },
        activationReport: true,
      },
      orderBy: { date: 'desc' },
    });

    // Supervisors don't see the financial side — strip pay rate from the response.
    const sanitised = jobs.map(({ hourlyRate, ...rest }) => rest);

    res.json(sanitised);
  } catch (err) {
    console.error('[Job] getSupervisorJobs error:', err);
    res.status(500).json({ error: 'Failed to fetch supervised jobs' });
  }
};

/**
 * GET /api/jobs/supervisor/insights
 * Real-time performance & budget snapshot, per business, for every campaign
 * this supervisor oversees: money in (PO budget) vs money out (committed/
 * spent), the promoters they work with, and simple "what's working / what
 * isn't" signals so the supervisor can advise the business on how to improve.
 * Polled by the frontend on an interval to approximate real-time.
 */
export const getSupervisorBusinessInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const jobs = await prisma.job.findMany({
      where: { supervisorId: userId },
      include: {
        shifts: {
          include: {
            promoter: { select: { id: true, fullName: true, phone: true, email: true, profilePhotoUrl: true, reliabilityScore: true } },
            payment: true,
          },
        },
        activationReport: true,
      },
      orderBy: { date: 'desc' },
    });

    // Group jobs by business (Client). Fall back to the free-text client
    // name for jobs created before clientId linking existed.
    const byBusiness = new Map<string, any>();
    for (const j of jobs) {
      const key = j.clientId || `name:${j.client}`;
      if (!byBusiness.has(key)) {
        byBusiness.set(key, {
          businessId: j.clientId || null,
          businessName: j.client,
          jobs: [] as typeof jobs,
        });
      }
      byBusiness.get(key).jobs.push(j);
    }

    // Pull PO budgets for the businesses that have a real clientId.
    const clientIds = Array.from(byBusiness.values()).map(b => b.businessId).filter(Boolean) as string[];
    const purchaseOrders = clientIds.length
      ? await prisma.purchaseOrder.findMany({
          where: { clientId: { in: clientIds } },
          include: { commitments: true },
        })
      : [];

    const ACTIVE_CE = ['pending', 'approved'];

    const insights = Array.from(byBusiness.values()).map(b => {
      const pos = purchaseOrders.filter(p => p.clientId === b.businessId);
      const budgetIn = pos.reduce((s, p) => s + p.amount, 0);
      const budgetOut = pos.reduce((s, p) => s + p.commitments.filter(c => ACTIVE_CE.includes(c.status)).reduce((s2, c) => s2 + c.amount, 0), 0);
      const budgetRemaining = budgetIn - budgetOut;

      const allShifts = b.jobs.flatMap((j: any) => j.shifts || []);
      const promoterMap = new Map<string, any>();
      allShifts.forEach((s: any) => { if (s.promoter) promoterMap.set(s.promoter.id, s.promoter); });
      const promoters = Array.from(promoterMap.values());

      const totalSlots = b.jobs.reduce((s: number, j: any) => s + (j.totalSlots || 0), 0);
      const filledSlots = b.jobs.reduce((s: number, j: any) => s + (j.filledSlots || 0), 0);
      const fillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 1000) / 10 : 0;

      const noShows = allShifts.filter((s: any) => s.status === 'NO_SHOW').length;
      const completed = allShifts.filter((s: any) => s.status === 'COMPLETED' || s.status === 'APPROVED').length;
      const lateShifts = allShifts.filter((s: any) => (s.lateMinutes || 0) > 0).length;
      const noShowRate = allShifts.length > 0 ? Math.round((noShows / allShifts.length) * 1000) / 10 : 0;

      const reports = b.jobs.map((j: any) => j.activationReport).filter(Boolean);
      const unitsServed = reports.reduce((s: number, r: any) => s + (r.unitsServed || 0), 0);
      const conversions = reports.reduce((s: number, r: any) => s + (r.conversions || 0), 0);
      const conversionRate = unitsServed > 0 ? Math.round((conversions / unitsServed) * 1000) / 10 : 0;

      // ── Simple, explainable heuristics for "what's working / what's not" ──
      const working: string[] = [];
      const notWorking: string[] = [];
      const suggestions: string[] = [];

      if (fillRate >= 85) working.push(`Strong slot fill rate (${fillRate}%) — staffing demand is being met.`);
      else if (fillRate > 0) { notWorking.push(`Slot fill rate is only ${fillRate}%.`); suggestions.push('Widen promoter pool or raise the hourly rate to attract more applicants.'); }

      if (noShowRate > 10) { notWorking.push(`No-show rate is ${noShowRate}% across shifts.`); suggestions.push('Tighten check-in reminders or review reliability scores before allocating promoters.'); }
      else if (allShifts.length > 0) working.push(`Low no-show rate (${noShowRate}%) — the promoter team is reliable.`);

      if (lateShifts > 0) { notWorking.push(`${lateShifts} shift(s) had late arrivals.`); suggestions.push('Consider promoters closer to the venue, or earlier check-in windows.'); }

      if (reports.length > 0) {
        if (conversionRate >= 20) working.push(`Healthy conversion rate (${conversionRate}%) from activation reports.`);
        else { notWorking.push(`Conversion rate is ${conversionRate}% on filed reports.`); suggestions.push('Review activation insights/feedback for merchandising or pitch adjustments.'); }
      }

      if (budgetIn > 0) {
        const pctUsed = Math.round((budgetOut / budgetIn) * 1000) / 10;
        if (budgetRemaining < 0) { notWorking.push('Budget has been exceeded on active POs.'); suggestions.push('Flag to admin — this business needs a topped-up PO before further jobs are booked.'); }
        else if (pctUsed >= 85) { notWorking.push(`${pctUsed}% of PO budget already committed.`); suggestions.push('Give the business early notice that a new PO will be needed soon.'); }
        else working.push(`Budget healthy — ${100 - pctUsed}% of PO remaining.`);
      }

      return {
        businessId: b.businessId,
        businessName: b.businessName,
        jobsCount: b.jobs.length,
        budgetIn, budgetOut, budgetRemaining,
        promotersCount: promoters.length,
        promoters: promoters.map((p: any) => ({ id: p.id, fullName: p.fullName, phone: p.phone, email: p.email, profilePhotoUrl: p.profilePhotoUrl, reliabilityScore: p.reliabilityScore })),
        fillRate, noShowRate, lateShifts, completedShifts: completed,
        unitsServed, conversions, conversionRate,
        reportsFiled: reports.filter((r: any) => r.status === 'submitted').length,
        working, notWorking, suggestions,
        generatedAt: new Date().toISOString(),
      };
    });

    res.json(insights);
  } catch (err) {
    console.error('[Job] getSupervisorBusinessInsights error:', err);
    res.status(500).json({ error: 'Failed to build business insights' });
  }
};

// Estimate shift length in hours from "HH:MM" strings, for credit cost calc.
// Falls back to a sane 8-hour default if the times are missing/invalid.
function estimateHours(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 8;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 8;
  let hours = (eh + em / 60) - (sh + sm / 60);
  if (hours <= 0) hours += 24; // shift crosses midnight
  return Math.max(hours, 0.5);
}

export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, client, clientId, supervisorId, brand, venue, address, lat, lng,
      date, startTime, endTime, hourlyRate, totalSlots,
      filledSlots, status, filters, termsAndConditions,
    } = req.body;

    if (!title || !client || !date) {
      res.status(400).json({ error: 'title, client and date are required' });
      return;
    }

    // Validate clientId belongs to a real BUSINESS user
    let resolvedClientId: string | null = null;
    if (req.user!.role === 'BUSINESS') {
      // A business can only ever post jobs against its own account — ignore
      // any clientId sent in the body to prevent spoofing another client.
      resolvedClientId = req.user!.id;
    } else if (clientId) {
      try {
        const bizUser = await prisma.user.findUnique({
          where: { id: clientId },
          select: { id: true, role: true },
        });
        if (bizUser && bizUser.role === 'BUSINESS') {
          resolvedClientId = bizUser.id;
        }
      } catch {
        // clientId column may not exist yet — continue without it
      }
    }

    // ── Business credit check + deduction ──────────────────────────────────
    // Businesses fund their own job postings from a prepaid credit balance;
    // admin-created jobs (on behalf of a client, tracked via PO/CE) are unaffected.
    let jobCost = 0;
    if (req.user!.role === 'BUSINESS') {
      const rate  = parseInt(hourlyRate) || 0;
      const slots = parseInt(totalSlots) || 1;
      const hours = estimateHours(startTime, endTime);
      jobCost = Math.round(rate * slots * hours);
    }

    // Validate supervisorId belongs to a real SUPERVISOR user
    let resolvedSupervisorId: string | null = null;
    if (supervisorId) {
      const supUser = await prisma.user.findUnique({
        where: { id: supervisorId },
        select: { id: true, role: true },
      });
      if (supUser && supUser.role === 'SUPERVISOR') {
        resolvedSupervisorId = supUser.id;
      } else {
        res.status(400).json({ error: 'supervisorId must belong to a SUPERVISOR user' });
        return;
      }
    }

    const createData: any = {
      title,
      client,
      brand:       brand || client,
      venue:       venue  || '',
      address:     address || venue || '',
      lat:         parseFloat(lat)  || -26.2041,
      lng:         parseFloat(lng)  || 28.0473,
      date:        new Date(date),
      startTime:   startTime || '09:00',
      endTime:     endTime   || '17:00',
      hourlyRate:  parseInt(hourlyRate) || 0,
      totalSlots:  parseInt(totalSlots) || 1,
      filledSlots: parseInt(filledSlots) || 0,
      status:      (status || 'OPEN').toUpperCase(),
      filters:     filters || {},
      createdBy:   req.user!.id,
    };

    if (resolvedClientId) {
      createData.clientId = resolvedClientId;
    }

    if (resolvedSupervisorId) {
      createData.supervisorId = resolvedSupervisorId;
    }

    if (termsAndConditions !== undefined) {
      createData.termsAndConditions = termsAndConditions;
    }

    if (jobCost > 0) {
      // Atomic conditional decrement — only succeeds if balance covers the cost,
      // preventing a race between the balance check and the deduction.
      const deducted = await prisma.user.updateMany({
        where: { id: req.user!.id, creditBalance: { gte: jobCost } },
        data:  { creditBalance: { decrement: jobCost } },
      });
      if (deducted.count === 0) {
        const current = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { creditBalance: true } });
        res.status(402).json({
          error: `Insufficient credit balance. This job costs R${jobCost.toLocaleString('en-ZA')} but your balance is R${(current?.creditBalance || 0).toLocaleString('en-ZA')}. Please top up your credit.`,
          required: jobCost,
          balance: current?.creditBalance || 0,
        });
        return;
      }
    }

    let job;
    try {
      job = await prisma.job.create({ data: createData });
    } catch (createErr) {
      // Refund the deducted credit if job creation failed after payment
      if (jobCost > 0) {
        await prisma.user.update({ where: { id: req.user!.id }, data: { creditBalance: { increment: jobCost } } }).catch(() => {});
        await auditLog({ userId: req.user!.id, action: 'CREDIT_REFUND', entity: 'User', entityId: req.user!.id, meta: { amount: jobCost } }).catch(() => {});
      }
      throw createErr;
    }

    await auditLog({ userId: req.user!.id, action: 'CREATE_JOB', entity: 'Job', entityId: job.id, meta: jobCost > 0 ? { creditDeducted: jobCost } : undefined });

    if (jobCost > 0) {
      const updatedUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { creditBalance: true } });
      res.status(201).json({ ...job, creditCharged: jobCost, creditBalance: updatedUser?.creditBalance ?? 0 });
      return;
    }
    res.status(201).json(job);
  } catch (err) {
    console.error('[Job] createJob error:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

export const updateJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, client, clientId, supervisorId, brand, venue, address, lat, lng,
      date, startTime, endTime, hourlyRate, totalSlots,
      filledSlots, status, filters, termsAndConditions,
    } = req.body;

    const existing = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'Job not found' }); return; }

    const isSupervisor = req.user?.role === 'SUPERVISOR';
    if (isSupervisor && existing.supervisorId !== req.user!.id) {
      res.status(403).json({ error: 'Supervisors may only edit promotions they are assigned to' });
      return;
    }

    // Validate clientId if being updated
    let resolvedClientId: string | null | undefined = undefined;
    if (clientId !== undefined) {
      if (!clientId) {
        resolvedClientId = null;
      } else {
        try {
          const bizUser = await prisma.user.findUnique({
            where: { id: clientId },
            select: { id: true, role: true },
          });
          resolvedClientId = bizUser?.role === 'BUSINESS' ? bizUser.id : null;
        } catch {
          // clientId column may not exist yet
        }
      }
    }

    // Validate supervisorId if being updated
    let resolvedSupervisorId: string | null | undefined = undefined;
    if (supervisorId !== undefined) {
      if (!supervisorId) {
        resolvedSupervisorId = null;
      } else {
        const supUser = await prisma.user.findUnique({
          where: { id: supervisorId },
          select: { id: true, role: true },
        });
        if (!supUser || supUser.role !== 'SUPERVISOR') {
          res.status(400).json({ error: 'supervisorId must belong to a SUPERVISOR user' });
          return;
        }
        resolvedSupervisorId = supUser.id;
      }
    }

    const updateData: any = {
      ...(title       !== undefined && { title }),
      ...(client      !== undefined && { client }),
      ...(brand       !== undefined && { brand }),
      ...(venue       !== undefined && { venue }),
      ...(address     !== undefined && { address }),
      ...(lat         !== undefined && { lat: parseFloat(lat) }),
      ...(lng         !== undefined && { lng: parseFloat(lng) }),
      ...(date        !== undefined && { date: new Date(date) }),
      ...(startTime   !== undefined && { startTime }),
      ...(endTime     !== undefined && { endTime }),
      ...(hourlyRate  !== undefined && !isSupervisor && { hourlyRate: parseInt(hourlyRate) }),
      ...(totalSlots  !== undefined && { totalSlots: parseInt(totalSlots) }),
      ...(filledSlots !== undefined && { filledSlots: parseInt(filledSlots) }),
      ...(status      !== undefined && { status: status.toUpperCase() }),
      ...(filters     !== undefined && { filters }),
      ...(termsAndConditions !== undefined && { termsAndConditions }),
    };

    if (resolvedClientId !== undefined) {
      updateData.clientId = resolvedClientId;
    }

    if (resolvedSupervisorId !== undefined) {
      updateData.supervisorId = resolvedSupervisorId;
    }

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await auditLog({ userId: req.user!.id, action: 'UPDATE_JOB', entity: 'Job', entityId: job.id });
    res.json(job);
  } catch (err) {
    console.error('[Job] updateJob error:', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
};

export const deleteJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'Job not found' }); return; }

    await prisma.job.delete({ where: { id: req.params.id } });
    await auditLog({ userId: req.user!.id, action: 'DELETE_JOB', entity: 'Job', entityId: req.params.id });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    console.error('[Job] deleteJob error:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
};

/**
 * GET /api/jobs/business
 * Dedicated endpoint for business users — guaranteed to return their jobs.
 * Tries every possible matching strategy so nothing slips through.
 */
export const getBusinessJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const bizUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    });

    // Build comprehensive OR conditions
    const orConditions: any[] = [
      // Most reliable: explicit clientId link
      { clientId: userId },
      // Exact name match
      ...(bizUser?.fullName ? [
        { client: { equals: bizUser.fullName, mode: 'insensitive' as const } },
        { brand:  { equals: bizUser.fullName, mode: 'insensitive' as const } },
        // Contains match (covers truncation)
        { client: { contains: bizUser.fullName, mode: 'insensitive' as const } },
        { brand:  { contains: bizUser.fullName, mode: 'insensitive' as const } },
      ] : []),
      // User ID stored directly in client field
      { client: { contains: userId, mode: 'insensitive' as const } },
    ];

    // Also match on individual significant name parts (e.g. "Vantage" from "Vantage Point Solutions")
    if (bizUser?.fullName) {
      const parts = bizUser.fullName.trim().split(/\s+/).filter(p => p.length > 3);
      for (const part of parts) {
        orConditions.push({ client: { contains: part, mode: 'insensitive' as const } });
        orConditions.push({ brand:  { contains: part, mode: 'insensitive' as const } });
      }
    }

    const jobs = await prisma.job.findMany({
      where: { OR: orConditions },
      include: {
        supervisor: { select: { id: true, fullName: true, email: true, phone: true } },
        applications: {
          include: {
            promoter: {
              select: {
                id: true, fullName: true, profilePhotoUrl: true, headshotUrl: true,
                fullBodyPhotoUrl: true, city: true, reliabilityScore: true, height: true,
                gender: true, clothingSize: true, shoeSize: true, phone: true, email: true,
                province: true, cvUrl: true, status: true, onboardingStatus: true, createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(jobs);
  } catch (err) {
    console.error('[Job] getBusinessJobs error:', err);
    res.status(500).json({ error: 'Failed to fetch business jobs' });
  }
};