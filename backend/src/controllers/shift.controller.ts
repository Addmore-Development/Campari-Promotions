import { Response } from 'express';
import { prisma } from '../config';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createPaymentForShift } from './payment.controller';

// ── Multer setup for selfie uploads ────────────────────────────────────────
const uploadDir = path.join(process.cwd(), 'uploads', 'selfies');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb)  => cb(null, `${Date.now()}-${file.originalname}`),
});

export const selfieUpload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).single('selfie');

// ── Geo-fence helper ────────────────────────────────────────────────────────
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GEO_FENCE_RADIUS  = 200;
const LATE_THRESHOLD_MS = 1 * 60 * 1000;

function getLateMinutes(jobDate: Date, startTime: string): number {
  const [h, m] = startTime.split(':').map(Number);
  const shiftStart = new Date(jobDate);
  shiftStart.setHours(h, m, 0, 0);
  const diffMs = Date.now() - shiftStart.getTime();
  if (diffMs <= LATE_THRESHOLD_MS) return 0;
  return Math.floor(diffMs / 60_000);
}

// ── Controllers ─────────────────────────────────────────────────────────────

export const getMyShifts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { promoterId: req.user!.id },
      include: {
        job: {
          select: {
            id: true, title: true, client: true, venue: true, address: true,
            streetNumber: true, streetName: true, suburb: true, city: true, postalCode: true,
            lat: true, lng: true, date: true, startTime: true, endTime: true, hourlyRate: true,
            status: true, totalSlots: true, filledSlots: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(shifts);
  } catch (err) {
    console.error('[Shift] getMyShifts error:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

export const getAllShifts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        promoter: {
          select: {
            id: true, fullName: true, email: true, phone: true,
            profilePhotoUrl: true, headshotUrl: true, city: true,
          },
        },
        job: {
          select: {
            id: true, title: true, client: true, venue: true, address: true,
            streetNumber: true, streetName: true, suburb: true, city: true, postalCode: true,
            lat: true, lng: true, date: true, startTime: true, endTime: true, hourlyRate: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(shifts);
  } catch (err) {
    console.error('[Shift] getAllShifts error:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

export const checkIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'A selfie photo is required to check in.' });
      return;
    }

    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id },
      include: {
        job: { select: { lat: true, lng: true, venue: true, address: true, date: true, startTime: true } },
      },
    });

    if (!shift) { res.status(404).json({ error: 'Shift not found' }); return; }
    if (shift.promoterId !== req.user!.id) { res.status(403).json({ error: 'Not your shift' }); return; }
    if (shift.status !== 'SCHEDULED') { res.status(400).json({ error: 'Shift is not in SCHEDULED status' }); return; }

    const { lat, lng } = req.body;
    if (lat !== undefined && lng !== undefined && shift.job) {
      const jobLat = shift.job.lat;
      const jobLng = shift.job.lng;
      if (jobLat && jobLng) {
        const dist = haversineMetres(Number(lat), Number(lng), jobLat, jobLng);
        if (dist > GEO_FENCE_RADIUS) {
          res.status(400).json({
            error: `You must be within ${GEO_FENCE_RADIUS}m of the venue to check in. You are ${Math.round(dist)}m away.`,
            distance: Math.round(dist),
            required: GEO_FENCE_RADIUS,
          });
          return;
        }
      }
    }

    let lateMinutes = 0;
    if (shift.job?.date && shift.job?.startTime) {
      lateMinutes = getLateMinutes(new Date(shift.job.date), shift.job.startTime);
    }

    const selfiePath = `/uploads/selfies/${req.file.filename}`;

    const updated = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        status:           'CHECKED_IN',
        checkInTime:      new Date(),
        checkInLat:       lat ? parseFloat(lat) : undefined,
        checkInLng:       lng ? parseFloat(lng) : undefined,
        selfieInUrl:      selfiePath,
        checkInSelfieUrl: selfiePath,
        ...(lateMinutes > 0 && { issueReport: `LATE_CHECK_IN:${lateMinutes}` }),
      },
    });

    res.json({ ...updated, lateMinutes, isLate: lateMinutes > 0 });
  } catch (err) {
    console.error('[Shift] checkIn error:', err);
    res.status(500).json({ error: 'Failed to check in' });
  }
};

export const checkOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'A selfie photo is required to check out.' });
      return;
    }

    // Fetch shift with job so we have hourlyRate for payment creation
    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id },
      include: {
        job: { select: { hourlyRate: true, title: true } },
      },
    });

    if (!shift) { res.status(404).json({ error: 'Shift not found' }); return; }
    if (shift.promoterId !== req.user!.id) { res.status(403).json({ error: 'Not your shift' }); return; }
    if (shift.status !== 'CHECKED_IN') { res.status(400).json({ error: 'Shift is not checked in' }); return; }

    const { lat, lng } = req.body;
    const selfiePath   = `/uploads/selfies/${req.file.filename}`;

    // ── Calculate hours worked ─────────────────────────────────────────────
    let hoursWorked = 0;
    if (shift.checkInTime) {
      const diffMs = Date.now() - new Date(shift.checkInTime).getTime();
      hoursWorked  = Math.round((diffMs / 3_600_000) * 100) / 100;
    }

    const updated = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        status:            'COMPLETED',
        checkOutTime:      new Date(),
        checkOutLat:       lat ? parseFloat(lat) : undefined,
        checkOutLng:       lng ? parseFloat(lng) : undefined,
        selfieOutUrl:      selfiePath,
        checkOutSelfieUrl: selfiePath,
        hoursWorked,
        totalHours: hoursWorked,
      },
    });

    // ── Auto-create Payment record for this shift ──────────────────────────
    // Uses hourlyRate from the job; non-fatal if it fails
    const hourlyRate = shift.job?.hourlyRate ?? 0;
    if (hoursWorked > 0 && hourlyRate > 0) {
      await createPaymentForShift(
        shift.id,
        shift.promoterId,
        hoursWorked,
        hourlyRate,
      );
    }

    res.json(updated);
  } catch (err) {
    console.error('[Shift] checkOut error:', err);
    res.status(500).json({ error: 'Failed to check out' });
  }
};

export const reportIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { issueText } = req.body;
    const shift = await prisma.shift.findUnique({ where: { id: req.params.id } });
    if (!shift) { res.status(404).json({ error: 'Shift not found' }); return; }
    if (shift.promoterId !== req.user!.id) { res.status(403).json({ error: 'Not your shift' }); return; }

    const updated = await prisma.shift.update({
      where: { id: req.params.id },
      data:  { issueReport: issueText },
    });
    res.json(updated);
  } catch (err) {
    console.error('[Shift] reportIssue error:', err);
    res.status(500).json({ error: 'Failed to report issue' });
  }
};

export const approveShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { hoursWorked, paymentStatus } = req.body;
    const shift = await prisma.shift.findUnique({ where: { id: req.params.id } });
    if (!shift) { res.status(404).json({ error: 'Shift not found' }); return; }

    const updated = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        status:        'APPROVED',
        hoursWorked:   hoursWorked   !== undefined ? parseFloat(hoursWorked) : undefined,
        paymentStatus: paymentStatus ?? undefined,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('[Shift] approveShift error:', err);
    res.status(500).json({ error: 'Failed to approve shift' });
  }
};

// ── getLiveLocations — returns full shift details including selfies ──────────
export const getLiveLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shifts = await prisma.shift.findMany({
      where: {
        status:  'CHECKED_IN',
        liveLat: { not: null },
        liveLng: { not: null },
      },
      include: {
        promoter: {
          select: {
            id: true, fullName: true, email: true, phone: true,
            profilePhotoUrl: true, headshotUrl: true, city: true,
            gender: true, height: true,
          },
        },
        job: {
          select: {
            id: true, title: true, client: true, venue: true, address: true,
            city: true, lat: true, lng: true, date: true,
            startTime: true, endTime: true, hourlyRate: true, status: true,
          },
        },
      },
    });

    const enriched = shifts.map(s => {
      const hoursElapsed = s.checkInTime
        ? (Date.now() - new Date(s.checkInTime).getTime()) / 3_600_000
        : 0;
      const currentEarnings = s.job?.hourlyRate
        ? Math.round(hoursElapsed * s.job.hourlyRate * 100) / 100
        : 0;

      return {
        userId:           s.promoterId,
        shiftId:          s.id,
        jobId:            s.jobId,
        lat:              s.liveLat,
        lng:              s.liveLng,
        timestamp:        s.liveUpdatedAt ? new Date(s.liveUpdatedAt).getTime() : Date.now(),
        checkInLat:       s.checkInLat,
        checkInLng:       s.checkInLng,
        promoterName:     s.promoter?.fullName,
        promoterPhoto:    s.promoter?.profilePhotoUrl || s.promoter?.headshotUrl,
        promoterEmail:    s.promoter?.email,
        promoterPhone:    s.promoter?.phone,
        promoterCity:     s.promoter?.city,
        promoterGender:   s.promoter?.gender,
        promoterHeight:   s.promoter?.height,
        jobTitle:         s.job?.title,
        jobClient:        s.job?.client,
        venue:            s.job?.venue,
        jobAddress:       s.job?.address,
        jobCity:          s.job?.city,
        jobLat:           s.job?.lat,
        jobLng:           s.job?.lng,
        jobDate:          s.job?.date,
        startTime:        s.job?.startTime,
        endTime:          s.job?.endTime,
        hourlyRate:       s.job?.hourlyRate,
        checkInTime:      s.checkInTime,
        checkOutTime:     s.checkOutTime,
        hoursWorked:      s.hoursWorked,
        paymentStatus:    s.paymentStatus,
        issueReport:      s.issueReport,
        selfieInUrl:      s.selfieInUrl  || s.checkInSelfieUrl,
        selfieOutUrl:     s.selfieOutUrl || s.checkOutSelfieUrl,
        currentEarnings,
        hoursElapsed:     Math.round(hoursElapsed * 100) / 100,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('[Shift] getLiveLocations error:', err);
    res.status(500).json({ error: 'Failed to fetch live locations' });
  }
};

export const updateLiveLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shiftId, lat, lng } = req.body;
    if (!shiftId || lat === undefined || lng === undefined) {
      res.status(400).json({ error: 'shiftId, lat and lng are required' });
      return;
    }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) { res.status(404).json({ error: 'Shift not found' }); return; }
    if (shift.promoterId !== req.user!.id) { res.status(403).json({ error: 'Not your shift' }); return; }
    if (shift.status !== 'CHECKED_IN') { res.status(400).json({ error: 'Shift is not active' }); return; }

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        liveLat:       parseFloat(lat),
        liveLng:       parseFloat(lng),
        liveUpdatedAt: new Date(),
      },
    });
    res.json({ ok: true, liveLat: updated.liveLat, liveLng: updated.liveLng });
  } catch (err) {
    console.error('[Shift] updateLiveLocation error:', err);
    res.status(500).json({ error: 'Failed to update location' });
  }
};