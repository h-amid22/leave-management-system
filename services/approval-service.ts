import "server-only";

import { db } from "@/db";
import { Prisma } from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { requireRole } from "@/lib/auth/authorization";
import { AuthorizationError } from "@/lib/auth/errors";
import { leaveBalanceService } from "@/services/leave-balance-service";
import {
  LeaveRequestConflictError,
  LeaveRequestNotFoundError,
  LeaveValidationError,
} from "@/services/leave-domain-errors";
import {
  createPaginationMeta,
  type PaginatedResult,
  type PaginationInput,
} from "@/services/service-types";

export interface PendingApprovalFilters extends PaginationInput {
  leaveTypeId?: string;
  startDate?: Date;
  endDate?: Date;
}

const approverRoles = ["MANAGER", "HR", "ADMIN"] as const;

const approvalSelect = {
  id: true,
  step: true,
  status: true,
  comment: true,
  decidedAt: true,
  approver: { select: { id: true, name: true, role: true } },
} as const;

const approvalRequestSelect = {
  id: true,
  startDate: true,
  endDate: true,
  requestedDays: true,
  reason: true,
  status: true,
  submittedAt: true,
  decidedAt: true,
  leaveType: {
    select: { id: true, code: true, name: true, description: true, isPaid: true },
  },
  requester: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
    },
  },
  approvals: { select: approvalSelect, orderBy: { step: "asc" as const } },
} as const;

function normalizeComment(comment: string | null | undefined) {
  if (comment === undefined || comment === null) {
    return null;
  }

  const normalizedComment = comment.trim();

  if (normalizedComment.length > 1000) {
    throw new LeaveValidationError(
      "Approval comment must not exceed 1000 characters",
    );
  }

  return normalizedComment || null;
}

function authorizeApprover(
  actor: AuthenticatedUser,
  requester: {
    id: string;
    departmentId: string | null;
    managerId: string | null;
  },
) {
  requireRole(actor, approverRoles);

  if (actor.id === requester.id) {
    throw new AuthorizationError("Users cannot approve or reject their own leave");
  }

  if (actor.role === "HR" || actor.role === "ADMIN") {
    return;
  }

  const supervisesRequester =
    actor.departmentId !== null &&
    requester.departmentId === actor.departmentId &&
    requester.managerId === actor.id;

  if (!supervisesRequester) {
    throw new AuthorizationError(
      "Managers may only act on leave for employees they directly supervise",
    );
  }
}

function isConcurrentDecisionConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "P2002" || error.code === "P2034")
  );
}

export class ApprovalService {
  async getPendingRequests(
    actor: AuthenticatedUser,
    filters: PendingApprovalFilters,
  ): Promise<PaginatedResult<unknown>> {
    requireRole(actor, approverRoles);

    if (actor.role === "MANAGER" && actor.departmentId === null) {
      return {
        data: [],
        meta: createPaginationMeta(filters, 0),
      };
    }

    const where: Prisma.LeaveRequestWhereInput = {
      status: "PENDING",
      requesterId: { not: actor.id },
      leaveTypeId: filters.leaveTypeId,
      startDate: filters.startDate ? { gte: filters.startDate } : undefined,
      endDate: filters.endDate ? { lte: filters.endDate } : undefined,
      requester:
        actor.role === "MANAGER"
          ? {
              is: {
                managerId: actor.id,
                departmentId: actor.departmentId,
                isActive: true,
              },
            }
          : undefined,
    };

    const [total, requests] = await db.$transaction([
      db.leaveRequest.count({ where }),
      db.leaveRequest.findMany({
        where,
        select: approvalRequestSelect,
        orderBy: [{ submittedAt: "asc" }, { startDate: "asc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
    ]);

    return {
      data: requests,
      meta: createPaginationMeta(filters, total),
    };
  }

  async approveRequest(
    actor: AuthenticatedUser,
    requestId: string,
    comment?: string | null,
  ) {
    try {
      return await db.$transaction(
        async (transaction) => {
        const request = await transaction.leaveRequest.findUnique({
          where: { id: requestId },
          include: {
            requester: {
              select: { id: true, departmentId: true, managerId: true },
            },
          },
        });

        if (!request) {
          throw new LeaveRequestNotFoundError();
        }

        authorizeApprover(actor, request.requester);

        if (request.status !== "PENDING") {
          throw new LeaveRequestConflictError(
            "Only pending leave requests can be approved",
          );
        }

        await leaveBalanceService.deductBalance(
          {
            userId: request.requesterId,
            leaveTypeId: request.leaveTypeId,
            year: request.startDate.getUTCFullYear(),
            days: request.requestedDays,
          },
          transaction,
        );

        const approval = await transaction.approval.create({
          data: {
            leaveRequestId: request.id,
            approverId: actor.id,
            step: 1,
            status: "APPROVED",
            comment: normalizeComment(comment),
            decidedAt: new Date(),
          },
          select: approvalSelect,
        });

        const updatedRequest = await transaction.leaveRequest.update({
          where: { id: request.id },
          data: { status: "APPROVED", decidedAt: new Date() },
          select: approvalRequestSelect,
        });

        return { request: updatedRequest, approval };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (isConcurrentDecisionConflict(error)) {
        throw new LeaveRequestConflictError(
          "The leave request was already processed or changed concurrently",
        );
      }

      throw error;
    }
  }

  async rejectRequest(
    actor: AuthenticatedUser,
    requestId: string,
    comment: string,
  ) {
    const normalizedComment = normalizeComment(comment);

    if (!normalizedComment) {
      throw new LeaveValidationError("A rejection comment is required");
    }

    try {
      return await db.$transaction(
        async (transaction) => {
        const request = await transaction.leaveRequest.findUnique({
          where: { id: requestId },
          include: {
            requester: {
              select: { id: true, departmentId: true, managerId: true },
            },
          },
        });

        if (!request) {
          throw new LeaveRequestNotFoundError();
        }

        authorizeApprover(actor, request.requester);

        if (request.status !== "PENDING") {
          throw new LeaveRequestConflictError(
            "Only pending leave requests can be rejected",
          );
        }

        const approval = await transaction.approval.create({
          data: {
            leaveRequestId: request.id,
            approverId: actor.id,
            step: 1,
            status: "REJECTED",
            comment: normalizedComment,
            decidedAt: new Date(),
          },
          select: approvalSelect,
        });

        const updatedRequest = await transaction.leaveRequest.update({
          where: { id: request.id },
          data: { status: "REJECTED", decidedAt: new Date() },
          select: approvalRequestSelect,
        });

        return { request: updatedRequest, approval };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (isConcurrentDecisionConflict(error)) {
        throw new LeaveRequestConflictError(
          "The leave request was already processed or changed concurrently",
        );
      }

      throw error;
    }
  }

  async getApprovalHistory(actor: AuthenticatedUser, requestId: string) {
    const request = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, departmentId: true, managerId: true },
        },
      },
    });

    if (!request) {
      throw new LeaveRequestNotFoundError();
    }

    if (actor.id !== request.requesterId) {
      authorizeApprover(actor, request.requester);
    }

    return db.approval.findMany({
      where: { leaveRequestId: requestId },
      select: approvalSelect,
      orderBy: [{ step: "asc" }, { createdAt: "asc" }],
    });
  }
}

export const approvalService = new ApprovalService();
