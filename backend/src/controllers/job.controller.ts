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

export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, client, clientId, brand, venue, address, lat, lng,
      date, startTime, endTime, hourlyRate, totalSlots,
      filledSlots, status, filters, termsAndConditions,
    } = req.body;

    if (!title || !client || !date) {
      res.status(400).json({ error: 'title, client and date are required' });
      return;
    }

    // Validate clientId belongs to a real BUSINESS user
    let resolvedClientId: string | null = null;
    if (clientId) {
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

    if (termsAndConditions !== undefined) {
      createData.termsAndConditions = termsAndConditions;
    }

    const job = await prisma.job.create({ data: createData });

    await auditLog({ userId: req.user!.id, action: 'CREATE_JOB', entity: 'Job', entityId: job.id });
    res.status(201).json(job);
  } catch (err) {
    console.error('[Job] createJob error:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

export const updateJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, client, clientId, brand, venue, address, lat, lng,
      date, startTime, endTime, hourlyRate, totalSlots,
      filledSlots, status, filters, termsAndConditions,
    } = req.body;

    const existing = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'Job not found' }); return; }

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
      ...(hourlyRate  !== undefined && { hourlyRate: parseInt(hourlyRate) }),
      ...(totalSlots  !== undefined && { totalSlots: parseInt(totalSlots) }),
      ...(filledSlots !== undefined && { filledSlots: parseInt(filledSlots) }),
      ...(status      !== undefined && { status: status.toUpperCase() }),
      ...(filters     !== undefined && { filters }),
      ...(termsAndConditions !== undefined && { termsAndConditions }),
    };

    if (resolvedClientId !== undefined) {
      updateData.clientId = resolvedClientId;
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