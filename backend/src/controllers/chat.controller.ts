import { Response } from 'express';
import { prisma } from '../config';
import { AuthRequest } from '../middleware/auth';

// ── GET threads for the current user ────────────────────────────────────────
export const getMyThreads = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const messages = await prisma.chatMessage.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        sender:   { select: { id: true, fullName: true, role: true } },
        receiver: { select: { id: true, fullName: true, role: true } },
      },
    });

    const threadMap = new Map<string, any>();

    messages.forEach(m => {
      const otherId   = m.senderId === userId ? m.receiverId : m.senderId;
      const otherUser = m.senderId === userId ? m.receiver   : m.sender;
      const tid       = otherId;

      if (!threadMap.has(tid)) {
        threadMap.set(tid, {
          threadId:    tid,
          otherId,
          otherName:   otherUser?.fullName || 'Unknown',
          otherRole:   (otherUser?.role || 'unknown').toLowerCase(),
          lastMessage: m.text,
          lastTime:    m.createdAt,
          unread:      (!m.read && m.receiverId === userId) ? 1 : 0,
        });
      } else {
        const t = threadMap.get(tid)!;
        if (new Date(m.createdAt) > new Date(t.lastTime)) {
          t.lastMessage = m.text;
          t.lastTime    = m.createdAt;
        }
        if (!m.read && m.receiverId === userId) t.unread += 1;
      }
    });

    res.json(
      Array.from(threadMap.values()).sort(
        (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
      )
    );
  } catch (err) {
    console.error('[Chat] getMyThreads error:', err);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
};

// ── GET messages between two users ──────────────────────────────────────────
export const getThreadMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId  = req.user!.id;
    const otherId = req.params.userId;

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: userId,  receiverId: otherId },
          { senderId: otherId, receiverId: userId  },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, fullName: true, role: true } } },
    });

    // Mark received messages as read
    await prisma.chatMessage.updateMany({
      where: { senderId: otherId, receiverId: userId, read: false },
      data:  { read: true },
    });

    res.json(messages);
  } catch (err) {
    console.error('[Chat] getThreadMessages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// ── POST send a message ─────────────────────────────────────────────────────
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const senderId             = req.user!.id;
    const { receiverId, text } = req.body;

    if (!receiverId || !text?.trim()) {
      res.status(400).json({ error: 'receiverId and text are required' });
      return;
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where:  { id: receiverId },
      select: { id: true },
    });
    if (!receiver) {
      res.status(404).json({ error: 'Receiver not found' });
      return;
    }

    const msg = await prisma.chatMessage.create({
      data: { senderId, receiverId, text: text.trim(), read: false },
      include: {
        sender:   { select: { id: true, fullName: true, role: true } },
        receiver: { select: { id: true, fullName: true, role: true } },
      },
    });

    res.json(msg);
  } catch (err) {
    console.error('[Chat] sendMessage error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// ── GET unread count ────────────────────────────────────────────────────────
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await prisma.chatMessage.count({
      where: { receiverId: req.user!.id, read: false },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// ── GET admin user ──────────────────────────────────────────────────────────
export const getAdminUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const admin = await prisma.user.findFirst({
      where:  { role: 'ADMIN' },
      select: { id: true, fullName: true, role: true },
    });
    if (!admin) { res.status(404).json({ error: 'No admin found' }); return; }
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: 'Failed to find admin' });
  }
};

// ── GET chatable users — ROLE AWARE ─────────────────────────────────────────
// ADMIN      → ALL promoters + ALL businesses (no filter needed)
// BUSINESS   → admin + promoters who have ANY shift on ANY of their jobs
// PROMOTER   → admin + businesses whose jobs they have ANY shift on
export const getChatableUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role   = req.user!.role; // 'ADMIN' | 'BUSINESS' | 'PROMOTER'

    // ── ADMIN: return every non-admin user ───────────────────────────────────
    if (role === 'ADMIN') {
      const users = await prisma.user.findMany({
        where:   { role: { in: ['PROMOTER', 'BUSINESS'] } },
        select:  { id: true, fullName: true, role: true, status: true },
        orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      });
      res.json(users);
      return;
    }

    // ── Shared: always include admin ─────────────────────────────────────────
    const adminUser = await prisma.user.findFirst({
      where:  { role: 'ADMIN' },
      select: { id: true, fullName: true, role: true, status: true },
    });

    // ── BUSINESS: admin + promoters who have shifts on their jobs ────────────
    if (role === 'BUSINESS') {
      // Find all jobs where this user is the client
      const myJobs = await prisma.job.findMany({
        where:  { clientId: userId },
        select: { id: true },
      });
      const myJobIds = myJobs.map(j => j.id);

      let promoters: any[] = [];
      if (myJobIds.length > 0) {
        // Get distinct promoter IDs who have shifts on those jobs
        const shifts = await prisma.shift.findMany({
          where:  { jobId: { in: myJobIds } },
          select: { promoterId: true },
          distinct: ['promoterId'],
        });
        const pIds = shifts.map(s => s.promoterId);
        if (pIds.length > 0) {
          promoters = await prisma.user.findMany({
            where:   { id: { in: pIds } },
            select:  { id: true, fullName: true, role: true, status: true },
            orderBy: { fullName: 'asc' },
          });
        }
      }

      res.json([
        ...(adminUser ? [adminUser] : []),
        ...promoters,
      ]);
      return;
    }

    // ── PROMOTER: admin + businesses whose jobs they have shifts on ──────────
    if (role === 'PROMOTER') {
      const myShifts = await prisma.shift.findMany({
        where:  { promoterId: userId },
        select: { job: { select: { clientId: true } } },
      });

      // Collect unique non-null clientIds
      const clientIds = [
        ...new Set(
          myShifts
            .map(s => s.job?.clientId)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      let businesses: any[] = [];
      if (clientIds.length > 0) {
        businesses = await prisma.user.findMany({
          where:   { id: { in: clientIds }, role: 'BUSINESS' },
          select:  { id: true, fullName: true, role: true, status: true },
          orderBy: { fullName: 'asc' },
        });
      }

      res.json([
        ...(adminUser ? [adminUser] : []),
        ...businesses,
      ]);
      return;
    }

    res.json([]);
  } catch (err) {
    console.error('[Chat] getChatableUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch chatable users' });
  }
};