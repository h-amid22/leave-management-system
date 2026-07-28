import "server-only";

import { db } from "@/db";
import { Prisma } from "@/generated/prisma/client";
import type { LeaveRequestStatus } from "@/generated/prisma/enums";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { AuthorizationError } from "@/lib/auth/errors";
import { leaveBalanceService } from "@/services/leave-balance-service";
import {
  LeavePolicyNotFoundError,
  LeaveRequestConflictError,
  LeaveRequestNotFoundError,
  LeaveValidationError,
} from "@/services/leave-domain-errors";
import {
  createPaginationMeta,
  type PaginatedResult,
  type PaginationInput,
} from "@/services/service-types";
import { userService } from "@/services/user-service";

export interface CreateLeaveRequestInput {
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string | null;
}

export interface UpdateLeaveRequestInput {
  leaveTypeId?: string;
  startDate?: Date;
  endDate?: Date;
  reason?: string | null;
}

export interface LeaveRequestFilters extends PaginationInput {
  status?: LeaveRequestStatus;
  leaveTypeId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface RequestDateRange {
  startDate: Date;
  endDate: Date;
  requestedDays: number;
  year: number;
}

type DatabaseClient = typeof db | Prisma.TransactionClient;

const millisecondsPerDay = 86_400_000;

const leaveRequestSelect = {
  id: true,
  requesterId: true,
  leaveTypeId: true,
  startDate: true,
  endDate: true,
  requestedDays: true,
  reason: true,
  status: true,
  submittedAt: true,
  decidedAt: true,
  cancelledAt: true,
  updatedAt: true,
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
  leaveType: {
    select: { id: true, code: true, name: true, description: true, isPaid: true },
  },
  approvals: {
    select: {
      id: true,
      step: true,
      status: true,
      comment: true,
      decidedAt: true,
      approver: { select: { id: true, name: true, role: true } },
    },
    orderBy: { step: "asc" as const },
  },
} as const;

function toPublicRequest<T extends { requesterId: string }>(request: T) {
  const { requesterId: _requesterId, ...publicRequest } = request;
  return publicRequest;
}

function normalizeDate(date: Date, fieldName: string) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new LeaveValidationError(`${fieldName} must be a valid date`);
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function validateDateRange(startValue: Date, endValue: Date): RequestDateRange {
  const startDate = normalizeDate(startValue, "Start date");
  const endDate = normalizeDate(endValue, "End date");
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  if (startDate < today) {
    throw new LeaveValidationError("Start date cannot be in the past");
  }

  if (startDate > endDate) {
    throw new LeaveValidationError("Start date must not be after end date");
  }

  if (startDate.getUTCFullYear() !== endDate.getUTCFullYear()) {
    throw new LeaveValidationError(
      "A leave request cannot span multiple balance years",
    );
  }

  return {
    startDate,
    endDate,
    requestedDays:
      Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) +
      1,
    year: startDate.getUTCFullYear(),
  };
}

function normalizeReason(reason: string | null | undefined) {
  if (reason === undefined || reason === null) {
    return reason;
  }

  const normalizedReason = reason.trim();

  if (normalizedReason.length > 1000) {
    throw new LeaveValidationError("Reason must not exceed 1000 characters");
  }

  return normalizedReason || null;
}

export class LeaveRequestService {
  private async ensureActiveLeaveType(
    leaveTypeId: string,
    database: DatabaseClient,
  ) {
    const leaveType = await database.leaveType.findFirst({
      where: { id: leaveTypeId, isActive: true },
      select: { id: true },
    });

    if (!leaveType) {
      throw new LeaveValidationError("Leave type is invalid or inactive");
    }
  }

  private async ensureEffectivePolicy(
    leaveTypeId: string,
    dates: Pick<RequestDateRange, "startDate" | "endDate">,
    database: DatabaseClient,
  ) {
    const policy = await database.leavePolicy.findFirst({
      where: {
        leaveTypeId,
        effectiveFrom: { lte: dates.startDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: dates.endDate } }],
      },
      select: { id: true },
      orderBy: { effectiveFrom: "desc" },
    });

    if (!policy) {
      throw new LeavePolicyNotFoundError();
    }
  }

  private async ensureNoOverlap(
    requesterId: string,
    dates: Pick<RequestDateRange, "startDate" | "endDate">,
    database: DatabaseClient,
    excludedRequestId?: string,
  ) {
    const overlappingRequest = await database.leaveRequest.findFirst({
      where: {
        requesterId,
        id: excludedRequestId ? { not: excludedRequestId } : undefined,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: dates.endDate },
        endDate: { gte: dates.startDate },
      },
      select: { id: true },
    });

    if (overlappingRequest) {
      throw new LeaveRequestConflictError(
        "The requested dates overlap an existing leave request",
      );
    }
  }

  async createLeaveRequest(
    actor: AuthenticatedUser,
    input: CreateLeaveRequestInput,
  ) {
    const dates = validateDateRange(input.startDate, input.endDate);

    return db.$transaction(
      async (transaction) => {
        await this.ensureActiveLeaveType(input.leaveTypeId, transaction);
        await this.ensureEffectivePolicy(input.leaveTypeId, dates, transaction);
        await this.ensureNoOverlap(actor.id, dates, transaction);
        await leaveBalanceService.checkAvailableBalance(
          {
            userId: actor.id,
            leaveTypeId: input.leaveTypeId,
            year: dates.year,
            days: dates.requestedDays,
          },
          transaction,
        );

        const request = await transaction.leaveRequest.create({
          data: {
            requesterId: actor.id,
            leaveTypeId: input.leaveTypeId,
            startDate: dates.startDate,
            endDate: dates.endDate,
            requestedDays: dates.requestedDays,
            reason: normalizeReason(input.reason),
          },
          select: leaveRequestSelect,
        });

        return toPublicRequest(request);
      },
      { isolationLevel: "Serializable" },
    );
  }

  async updatePendingRequest(
    actor: AuthenticatedUser,
    requestId: string,
    input: UpdateLeaveRequestInput,
  ) {
    return db.$transaction(
      async (transaction) => {
        const existingRequest = await transaction.leaveRequest.findUnique({
          where: { id: requestId },
        });

        if (!existingRequest) {
          throw new LeaveRequestNotFoundError();
        }

        if (existingRequest.requesterId !== actor.id) {
          throw new AuthorizationError();
        }

        if (existingRequest.status !== "PENDING") {
          throw new LeaveRequestConflictError(
            "Only pending leave requests can be edited",
          );
        }

        const leaveTypeId = input.leaveTypeId ?? existingRequest.leaveTypeId;
        const dates = validateDateRange(
          input.startDate ?? existingRequest.startDate,
          input.endDate ?? existingRequest.endDate,
        );

        await this.ensureActiveLeaveType(leaveTypeId, transaction);
        await this.ensureEffectivePolicy(leaveTypeId, dates, transaction);
        await this.ensureNoOverlap(actor.id, dates, transaction, requestId);
        await leaveBalanceService.checkAvailableBalance(
          {
            userId: actor.id,
            leaveTypeId,
            year: dates.year,
            days: dates.requestedDays,
          },
          transaction,
        );

        const request = await transaction.leaveRequest.update({
          where: { id: requestId },
          data: {
            leaveTypeId,
            startDate: dates.startDate,
            endDate: dates.endDate,
            requestedDays: dates.requestedDays,
            reason:
              input.reason === undefined
                ? existingRequest.reason
                : normalizeReason(input.reason),
          },
          select: leaveRequestSelect,
        });

        return toPublicRequest(request);
      },
      { isolationLevel: "Serializable" },
    );
  }

  async cancelPendingRequest(actor: AuthenticatedUser, requestId: string) {
    const result = await db.leaveRequest.updateMany({
      where: {
        id: requestId,
        requesterId: actor.id,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: actor.id,
      },
    });

    if (result.count !== 1) {
      const existingRequest = await db.leaveRequest.findUnique({
        where: { id: requestId },
        select: { requesterId: true, status: true },
      });

      if (!existingRequest) {
        throw new LeaveRequestNotFoundError();
      }

      if (existingRequest.requesterId !== actor.id) {
        throw new AuthorizationError();
      }

      throw new LeaveRequestConflictError(
        "Only pending leave requests can be cancelled",
      );
    }

    const request = await db.leaveRequest.findUnique({
      where: { id: requestId },
      select: leaveRequestSelect,
    });

    if (!request) {
      throw new LeaveRequestNotFoundError();
    }

    return toPublicRequest(request);
  }

  async getRequestHistory(
    actor: AuthenticatedUser,
    filters: LeaveRequestFilters,
  ): Promise<PaginatedResult<ReturnType<typeof toPublicRequest>>> {
    const where: Prisma.LeaveRequestWhereInput = {
      requesterId: actor.id,
      status: filters.status,
      leaveTypeId: filters.leaveTypeId,
      startDate: filters.startDate ? { gte: filters.startDate } : undefined,
      endDate: filters.endDate ? { lte: filters.endDate } : undefined,
    };

    const [total, requests] = await db.$transaction([
      db.leaveRequest.count({ where }),
      db.leaveRequest.findMany({
        where,
        select: leaveRequestSelect,
        orderBy: [{ startDate: "desc" }, { submittedAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
    ]);

    return {
      data: requests.map(toPublicRequest),
      meta: createPaginationMeta(filters, total),
    };
  }

  async getRequestById(actor: AuthenticatedUser, requestId: string) {
    const request = await db.leaveRequest.findUnique({
      where: { id: requestId },
      select: leaveRequestSelect,
    });

    if (!request) {
      throw new LeaveRequestNotFoundError();
    }

    if (request.requesterId !== actor.id) {
      await userService.requireAccessibleUser(actor, request.requesterId, {
        allowSelf: false,
      });
    }

    return toPublicRequest(request);
  }
}

export const leaveRequestService = new LeaveRequestService();
