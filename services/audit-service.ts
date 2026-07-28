import "server-only";

import { db } from "@/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import type { AuthenticatedUser } from "@/lib/auth/types";
import type { RequestContext } from "@/lib/observability/request-context";
import { createPaginationMeta, type PaginationInput } from "@/services/service-types";

type DatabaseClient = typeof db | Prisma.TransactionClient;

export interface AuditInput {
  actor: AuthenticatedUser | null;
  targetEntityType: string;
  targetEntityId?: string | null;
  action: string;
  metadata?: Prisma.InputJsonObject;
  context: RequestContext;
}

export interface AuditFilters extends PaginationInput {
  search?: string; action?: string; actorUserId?: string; entityType?: string;
  startDate?: Date; endDate?: Date; order: "asc" | "desc";
}

export const auditService = {
  async record(input: AuditInput, database: DatabaseClient = db) {
    return database.auditEvent.create({ data: {
      actorUserId: input.actor?.id ?? null,
      actorName: input.actor?.name ?? "System",
      actorRole: input.actor?.role ?? "SYSTEM",
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId ?? null,
      action: input.action,
      metadata: input.metadata ?? {},
      requestId: input.context.requestId,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    }});
  },

  async list(actor: AuthenticatedUser, filters: AuditFilters) {
    requireRole(actor, ["ADMIN"]);
    const where: Prisma.AuditEventWhereInput = {
      action: filters.action,
      actorUserId: filters.actorUserId,
      targetEntityType: filters.entityType,
      createdAt: { gte: filters.startDate, lte: filters.endDate },
      OR: filters.search ? [
        { actorName: { contains: filters.search, mode: "insensitive" } },
        { action: { contains: filters.search, mode: "insensitive" } },
        { targetEntityId: { contains: filters.search, mode: "insensitive" } },
      ] : undefined,
    };
    const [total, data] = await db.$transaction([
      db.auditEvent.count({ where }),
      db.auditEvent.findMany({ where, orderBy: { createdAt: filters.order }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
    ]);
    return { data, meta: createPaginationMeta(filters, total) };
  },
};
