import "server-only";

import { db } from "@/db";
import { Prisma } from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/types";
import {
  InsufficientLeaveBalanceError,
  LeaveBalanceNotFoundError,
  LeaveRequestConflictError,
  LeaveValidationError,
} from "@/services/leave-domain-errors";
import { userService } from "@/services/user-service";

type DatabaseClient = typeof db | Prisma.TransactionClient;

export interface LeaveBalanceSummary {
  balanceId: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  entitledDays: Prisma.Decimal;
  carriedDays: Prisma.Decimal;
  usedDays: Prisma.Decimal;
  remainingDays: Prisma.Decimal;
}

interface BalanceKey {
  userId: string;
  leaveTypeId: string;
  year: number;
}

type DecimalValue = string | number | Prisma.Decimal;

interface BalanceMutation extends BalanceKey {
  days: DecimalValue;
}

function toPositiveDays(value: DecimalValue) {
  const days = new Prisma.Decimal(value);

  if (!days.isPositive() || days.decimalPlaces() > 2) {
    throw new LeaveValidationError(
      "Leave days must be positive with no more than two decimal places",
    );
  }

  return days;
}

export class LeaveBalanceService {
  async getBalancesForUser(
    actor: AuthenticatedUser,
    targetUserId: string = actor.id,
    options: { allowSelf?: boolean } = {},
  ) {
    await userService.requireAccessibleUser(actor, targetUserId, options);

    const balances = await db.leaveBalance.findMany({
      where: { userId: targetUserId },
      select: {
        id: true,
        year: true,
        entitledDays: true,
        carriedDays: true,
        usedDays: true,
        leaveType: {
          select: { id: true, code: true, name: true, isPaid: true },
        },
      },
      orderBy: [{ year: "desc" }, { leaveType: { name: "asc" } }],
    });

    return balances.map((balance) => ({
      id: balance.id,
      year: balance.year,
      entitledDays: balance.entitledDays,
      carriedDays: balance.carriedDays,
      usedDays: balance.usedDays,
      remainingDays: balance.entitledDays
        .plus(balance.carriedDays)
        .minus(balance.usedDays),
      leaveType: balance.leaveType,
    }));
  }

  async calculateRemainingBalance(
    key: BalanceKey,
    database: DatabaseClient = db,
  ): Promise<LeaveBalanceSummary> {
    const { userId, leaveTypeId, year } = key;
    const balance = await database.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: { userId, leaveTypeId, year },
      },
    });

    if (!balance) {
      throw new LeaveBalanceNotFoundError();
    }

    const remainingDays = balance.entitledDays
      .plus(balance.carriedDays)
      .minus(balance.usedDays);

    return { ...balance, balanceId: balance.id, remainingDays };
  }

  async checkAvailableBalance(
    input: BalanceMutation,
    database: DatabaseClient = db,
  ): Promise<LeaveBalanceSummary> {
    const requestedDays = toPositiveDays(input.days);
    const balance = await this.calculateRemainingBalance(input, database);

    if (balance.remainingDays.lessThan(requestedDays)) {
      throw new InsufficientLeaveBalanceError();
    }

    return balance;
  }

  async deductBalance(
    input: BalanceMutation,
    database: DatabaseClient = db,
  ): Promise<LeaveBalanceSummary> {
    const days = toPositiveDays(input.days);
    const balance = await this.checkAvailableBalance(input, database);

    const result = await database.leaveBalance.updateMany({
      where: {
        id: balance.balanceId,
        usedDays: balance.usedDays,
      },
      data: {
        usedDays: { increment: days },
      },
    });

    if (result.count !== 1) {
      throw new LeaveRequestConflictError(
        "Leave balance changed while the request was being processed",
      );
    }

    return this.calculateRemainingBalance(input, database);
  }

  async restoreBalance(
    input: BalanceMutation,
    database: DatabaseClient = db,
  ): Promise<LeaveBalanceSummary> {
    const days = toPositiveDays(input.days);
    const balance = await this.calculateRemainingBalance(input, database);

    if (balance.usedDays.lessThan(days)) {
      throw new LeaveRequestConflictError(
        "Cannot restore more leave than has been deducted",
      );
    }

    const result = await database.leaveBalance.updateMany({
      where: {
        id: balance.balanceId,
        usedDays: balance.usedDays,
      },
      data: {
        usedDays: { decrement: days },
      },
    });

    if (result.count !== 1) {
      throw new LeaveRequestConflictError(
        "Leave balance changed while the request was being processed",
      );
    }

    return this.calculateRemainingBalance(input, database);
  }
}

export const leaveBalanceService = new LeaveBalanceService();
