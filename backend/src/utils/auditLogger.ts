import { prisma } from '../config';

interface AuditOptions {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}

export const auditLog = async (opts: AuditOptions): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        meta: (opts.meta ?? {}) as any,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err);
  }
};