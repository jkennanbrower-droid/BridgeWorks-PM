import "server-only";

import { getPrisma, type Prisma } from "db";

type AuditEntry = {
  actorPersonId: string;
  action: string;
  targetType: string;
  targetId: string;
  orgId?: string | null;
  payload?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function logAudit(entry: AuditEntry) {
  const prisma = getPrisma();
  return prisma.auditLog.create({
    data: {
      actorPersonId: entry.actorPersonId,
      orgId: entry.orgId ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      payload: entry.payload ?? undefined,
      ip: entry.ip ?? undefined,
      userAgent: entry.userAgent ?? undefined,
    },
  });
}
