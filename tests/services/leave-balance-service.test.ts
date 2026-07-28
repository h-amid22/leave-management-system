import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    leaveBalance: { findUnique: mocks.findUnique },
  },
}));

vi.mock("@/services/user-service", () => ({
  userService: { requireAccessibleUser: vi.fn() },
}));

import { leaveBalanceService } from "@/services/leave-balance-service";

beforeEach(() => {
  mocks.findUnique.mockResolvedValue({
    id: "balance-id",
    userId: "user-id",
    leaveTypeId: "leave-type-id",
    year: 2026,
    entitledDays: new Prisma.Decimal(20),
    carriedDays: new Prisma.Decimal(0),
    usedDays: new Prisma.Decimal(0),
  });
});

describe("leave balance lookup", () => {
  it("uses only compound-key fields when checking a balance", async () => {
    await leaveBalanceService.checkAvailableBalance({
      userId: "user-id",
      leaveTypeId: "leave-type-id",
      year: 2026,
      days: 2,
    });

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: {
        userId_leaveTypeId_year: {
          userId: "user-id",
          leaveTypeId: "leave-type-id",
          year: 2026,
        },
      },
    });
  });
});
