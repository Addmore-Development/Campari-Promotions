import { Response } from 'express';
import { prisma } from '../config';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

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

// ── SUPERVISOR -> ADMIN message-request gating (Instagram-DM style) ────────
// The supervisor's first message to an admin creates a pending ChatRequest.
// Everything the supervisor sends after that is blocked until an admin
// accepts it. Once accepted, the thread behaves like any normal chat.
async function checkSupervisorAdminGate(senderId: string, senderRole: string, receiverRole: string): Promise<{ blocked: boolean; reason?: string; isFirstMessage?: boolean }> {
  if (senderRole !== 'SUPERVISOR' || receiverRole !== 'ADMIN') return { blocked: false };

  const existing = await prisma.chatRequest.findUnique({ where: { supervisorId: senderId } });

  if (!existing) {
    await prisma.chatRequest.create({ data: { supervisorId: senderId, status: 'pending' } });
    return { blocked: false, isFirstMessage: true };
  }

  if (existing.status === 'accepted') return { blocked: false };

  if (existing.status === 'pending') {
    return { blocked: true, reason: 'Your message request is awaiting admin approval. You can only send one message until it is accepted.' };
  }

  // declined
  return { blocked: true, reason: 'Your message request was declined by admin.' };
}

// ── POST send a message ─────────────────────────────────────────────────────
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const senderId             = req.user!.id;
    const senderRole           = req.user!.role;
    const { receiverId, text } = req.body;

    if (!receiverId || !text?.trim()) {
      res.status(400).json({ error: 'receiverId and text are required' });
      return;
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where:  { id: receiverId },
      select: { id: true, role: true },
    });
    if (!receiver) {
      res.status(404).json({ error: 'Receiver not found' });
      return;
    }

    // If this is a supervisor messaging an admin, and they've already sent
    // their one allowed "request" message and it's still pending/declined,
    // block further sends until an admin accepts.
    if (senderRole === 'SUPERVISOR' && receiver.role === 'ADMIN') {
      const gate = await checkSupervisorAdminGate(senderId, senderRole, receiver.role);
      if (gate.blocked) {
        res.status(403).json({ error: gate.reason, requestGated: true });
        return;
      }
    }

    const msg = await prisma.chatMessage.create({
      data: { senderId, receiverId, text: text.trim(), read: false },
      include: {
        sender:   { select: { id: true, fullName: true, role: true } },
        receiver: { select: { id: true, fullName: true, role: true } },
      },
    });

    // Push live to anyone subscribed to this thread — non-fatal, chat still
    // works via the existing REST polling if this fails or Realtime isn't set up.
    try {
      const threadChannel = [senderId, receiverId].sort().join('__');
      await supabaseAdmin.channel(`chat:${threadChannel}`).send({
        type: 'broadcast',
        event: 'new_message',
        payload: msg,
      });
    } catch (broadcastErr) {
      console.error('[Chat] realtime broadcast failed (non-fatal):', broadcastErr);
    }

    res.json(msg);
  } catch (err) {
    console.error('[Chat] sendMessage error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// ── GET the current supervisor's own chat-request status ──────────────────
export const getMyChatRequestStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'SUPERVISOR') { res.json({ status: 'n/a' }); return; }
    const request = await prisma.chatRequest.findUnique({ where: { supervisorId: req.user!.id } });
    res.json({ status: request?.status || 'none' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat request status' });
  }
};

// ── ADMIN: list pending supervisor message requests ────────────────────────
export const getPendingChatRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ADMIN') { res.status(403).json({ error: 'Admins only' }); return; }
    const requests = await prisma.chatRequest.findMany({
      where: { status: 'pending' },
      include: { supervisor: { select: { id: true, fullName: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat requests' });
  }
};

// ── ADMIN: accept or decline a supervisor's message request ────────────────
export const respondToChatRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ADMIN') { res.status(403).json({ error: 'Admins only' }); return; }
    const { supervisorId } = req.params;
    const { accept } = req.body; // boolean

    const existing = await prisma.chatRequest.findUnique({ where: { supervisorId } });
    if (!existing) { res.status(404).json({ error: 'No pending request from this supervisor' }); return; }

    const updated = await prisma.chatRequest.update({
      where: { supervisorId },
      data: {
        status: accept ? 'accepted' : 'declined',
        respondedAt: new Date(),
        respondedBy: req.user!.id,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('[Chat] respondToChatRequest error:', err);
    res.status(500).json({ error: 'Failed to respond to chat request' });
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

// ── SUPERVISOR: re-send a message request after a decline ─────────────────
export const resendChatRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'SUPERVISOR') { res.status(403).json({ error: 'Supervisors only' }); return; }
    const existing = await prisma.chatRequest.findUnique({ where: { supervisorId: req.user!.id } });
    if (!existing || existing.status !== 'declined') {
      res.status(400).json({ error: 'No declined request to resend' });
      return;
    }
    const updated = await prisma.chatRequest.update({
      where: { supervisorId: req.user!.id },
      data: { status: 'pending', respondedAt: null, respondedBy: null },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend chat request' });
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
// ADMIN      → ALL promoters + ALL businesses + ALL supervisors (no filter needed)
// BUSINESS   → admin + promoters who have ANY shift on ANY of their jobs
//              + supervisors assigned to ANY of their jobs
// PROMOTER   → admin + businesses whose jobs they have ANY shift on
//              + supervisors assigned to the jobs they have a shift on
// SUPERVISOR → admin + promoters with a shift on a job they supervise
//              + businesses (clients) of the jobs they supervise
export const getChatableUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role   = req.user!.role; // 'ADMIN' | 'BUSINESS' | 'PROMOTER' | 'SUPERVISOR'

    // ── ADMIN: return every non-admin user ───────────────────────────────────
    if (role === 'ADMIN') {
      const users = await prisma.user.findMany({
        where:   { role: { in: ['PROMOTER', 'BUSINESS', 'SUPERVISOR'] } },
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

    // ── BUSINESS: admin + promoters who have shifts on their jobs
    //             + supervisors assigned to their jobs ──────────────────────
    if (role === 'BUSINESS') {
      // Find all jobs where this user is the client
      const myJobs = await prisma.job.findMany({
        where:  { clientId: userId },
        select: { id: true, supervisorId: true },
      });
      const myJobIds = myJobs.map(j => j.id);
      const supervisorIds = [
        ...new Set(myJobs.map(j => j.supervisorId).filter((id): id is string => Boolean(id))),
      ];

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

      const supervisors = supervisorIds.length > 0
        ? await prisma.user.findMany({
            where:   { id: { in: supervisorIds } },
            select:  { id: true, fullName: true, role: true, status: true },
            orderBy: { fullName: 'asc' },
          })
        : [];

      res.json([
        ...(adminUser ? [adminUser] : []),
        ...supervisors,
        ...promoters,
      ]);
      return;
    }

    // ── PROMOTER: admin + businesses whose jobs they have shifts on
    //             + supervisors of the jobs they have shifts on ─────────────
    if (role === 'PROMOTER') {
      const myShifts = await prisma.shift.findMany({
        where:  { promoterId: userId },
        select: { job: { select: { clientId: true, supervisorId: true } } },
      });

      // Collect unique non-null clientIds and supervisorIds
      const clientIds = [
        ...new Set(
          myShifts
            .map(s => s.job?.clientId)
            .filter((id): id is string => Boolean(id))
        ),
      ];
      const supervisorIds = [
        ...new Set(
          myShifts
            .map(s => s.job?.supervisorId)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const [businesses, supervisors] = await Promise.all([
        clientIds.length > 0
          ? prisma.user.findMany({
              where:   { id: { in: clientIds }, role: 'BUSINESS' },
              select:  { id: true, fullName: true, role: true, status: true },
              orderBy: { fullName: 'asc' },
            })
          : Promise.resolve([]),
        supervisorIds.length > 0
          ? prisma.user.findMany({
              where:   { id: { in: supervisorIds }, role: 'SUPERVISOR' },
              select:  { id: true, fullName: true, role: true, status: true },
              orderBy: { fullName: 'asc' },
            })
          : Promise.resolve([]),
      ]);

      res.json([
        ...(adminUser ? [adminUser] : []),
        ...supervisors,
        ...businesses,
      ]);
      return;
    }

    // ── SUPERVISOR: admin + promoters with a shift on a job they supervise
    //               + businesses (clients) of the jobs they supervise ───────
    if (role === 'SUPERVISOR') {
      const myJobs = await prisma.job.findMany({
        where:  { supervisorId: userId },
        select: { id: true, clientId: true },
      });
      const myJobIds  = myJobs.map(j => j.id);
      const clientIds = [
        ...new Set(myJobs.map(j => j.clientId).filter((id): id is string => Boolean(id))),
      ];

      const [promoters, businesses] = await Promise.all([
        myJobIds.length > 0
          ? prisma.shift.findMany({
              where:    { jobId: { in: myJobIds } },
              select:   { promoterId: true },
              distinct: ['promoterId'],
            }).then(shifts => {
              const pIds = shifts.map(s => s.promoterId);
              return pIds.length > 0
                ? prisma.user.findMany({
                    where:   { id: { in: pIds } },
                    select:  { id: true, fullName: true, role: true, status: true },
                    orderBy: { fullName: 'asc' },
                  })
                : [];
            })
          : Promise.resolve([]),
        clientIds.length > 0
          ? prisma.user.findMany({
              where:   { id: { in: clientIds }, role: 'BUSINESS' },
              select:  { id: true, fullName: true, role: true, status: true },
              orderBy: { fullName: 'asc' },
            })
          : Promise.resolve([]),
      ]);

      res.json([
        ...(adminUser ? [adminUser] : []),
        ...businesses,
        ...promoters,
      ]);
      return;
    }

    res.json([]);
  } catch (err) {
    console.error('[Chat] getChatableUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch chatable users' });
  }
};