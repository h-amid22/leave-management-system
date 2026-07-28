import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  InsufficientLeaveBalanceError,
  LeavePolicyNotFoundError,
  LeaveRequestConflictError,
  LeaveValidationError,
} from "@/services/leave-domain-errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  leaveTypeFindFirst: vi.fn(),
  policyFindFirst: vi.fn(),
  requestFindFirst: vi.fn(),
  requestFindUnique: vi.fn(),
  requestCreate: vi.fn(),
  requestUpdate: vi.fn(),
  checkBalance: vi.fn(),
}));

const transactionClient = {
  leaveType: { findFirst: mocks.leaveTypeFindFirst },
  leavePolicy: { findFirst: mocks.policyFindFirst },
  leaveRequest: {
    findFirst: mocks.requestFindFirst,
    findUnique: mocks.requestFindUnique,
    create: mocks.requestCreate,
    update: mocks.requestUpdate,
  },
};

vi.mock("@/db", () => ({
  db: {
    $transaction: mocks.transaction,
    leaveRequest: { findUnique: mocks.requestFindUnique },
  },
}));

vi.mock("@/services/leave-balance-service", () => ({
  leaveBalanceService: { checkAvailableBalance: mocks.checkBalance },
}));

vi.mock("@/services/user-service", () => ({
  userService: { requireAccessibleUser: vi.fn() },
}));

import { leaveRequestService } from "@/services/leave-request-service";

const leaveTypeId = "44444444-4444-4444-8444-444444444444";
const requestId = "33333333-3333-4333-8333-333333333333";
const createInput = {
  leaveTypeId,
  startDate: new Date("2026-08-01T00:00:00.000Z"),
  endDate: new Date("2026-08-02T00:00:00.000Z"),
};

beforeEach(() => {
  mocks.transaction.mockImplementation(
    async (callback: (client: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );
  mocks.leaveTypeFindFirst.mockResolvedValue({ id: leaveTypeId });
  mocks.policyFindFirst.mockResolvedValue({ id: "policy" });
  mocks.requestFindFirst.mockResolvedValue(null);
  mocks.checkBalance.mockResolvedValue({});
  mocks.requestCreate.mockResolvedValue({
    id: requestId,
    requesterId: createActor().id,
    status: "PENDING",
  });
});

describe("leave-request creation rules", () => {
  it("rejects past dates on the server", async () => {
    await expect(
      leaveRequestService.createLeaveRequest(createActor(), {
        ...createInput,
        startDate: new Date("2000-01-01T00:00:00.000Z"),
        endDate: new Date("2000-01-02T00:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(LeaveValidationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requires an effective policy", async () => {
    mocks.policyFindFirst.mockResolvedValue(null);

    await expect(
      leaveRequestService.createLeaveRequest(createActor(), createInput),
    ).rejects.toBeInstanceOf(LeavePolicyNotFoundError);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
  });

  it("blocks overlapping leave", async () => {
    mocks.requestFindFirst.mockResolvedValue({ id: "overlap" });

    await expect(
      leaveRequestService.createLeaveRequest(createActor(), createInput),
    ).rejects.toBeInstanceOf(LeaveRequestConflictError);
  });

  it("blocks insufficient balance", async () => {
    mocks.checkBalance.mockRejectedValue(new InsufficientLeaveBalanceError());

    await expect(
      leaveRequestService.createLeaveRequest(createActor(), createInput),
    ).rejects.toBeInstanceOf(InsufficientLeaveBalanceError);
  });

  it("does not select sensitive authentication or audit fields", async () => {
    await leaveRequestService.createLeaveRequest(createActor(), createInput);

    const createOptions = mocks.requestCreate.mock.calls[0]?.[0];
    const serializedSelect = JSON.stringify(createOptions?.select);

    expect(serializedSelect).not.toContain("authProviderId");
    expect(serializedSelect).not.toContain("password");
    expect(serializedSelect).not.toContain("cancelledById");
    expect(serializedSelect).not.toContain("createdAt");
  });
});

describe("leave-request updates", () => {
  it("does not allow approved requests to be edited", async () => {
    mocks.requestFindUnique.mockResolvedValue({
      id: requestId,
      requesterId: createActor().id,
      leaveTypeId,
      startDate: createInput.startDate,
      endDate: createInput.endDate,
      reason: null,
      status: "APPROVED",
    });

    await expect(
      leaveRequestService.updatePendingRequest(createActor(), requestId, {
        reason: "Changed",
      }),
    ).rejects.toBeInstanceOf(LeaveRequestConflictError);
  });
});
