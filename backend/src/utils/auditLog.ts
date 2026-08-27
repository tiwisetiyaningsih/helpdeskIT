import { prisma } from "../config/prisma";
import { logger } from "./logger";

type AuditLogInput = {
  actorId?: number | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | number | null;
  metadata?: Record<string, any> | null;
};

export async function recordAuditLog(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId != null ? String(input.targetId) : null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    logger.error({ err: error, input }, "gagal menulis audit log");
  }
}