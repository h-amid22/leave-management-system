import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/auth/errors";
import { InsufficientLeaveBalanceError, LeaveRequestConflictError } from "@/services/leave-domain-errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  requestFindUnique: vi.fn(),
  requestUpdate: vi.fn(),
  approvalCreate: vi.fn(),
  deductBalance: vi.fn(),
  requestCount: vi.fn(),
  requestFindMany: vi.fn(),
}));

const transactionClient = {
  leaveRequest: {
    findUnique: mocks.requestFindUnique,
    update: mocks.requestUpdate,
  },
  approval: { create: mocks.approvalCreate },
};

vi.mock("@/db", () => ({
  db: {
    $transaction: mocks.transaction,
    leaveRequest: {
      count: mocks.requestCount,
      findMany: mocks.requestFindMany,
    },
  },
}));

vi.mock("@/services/leave-balance-service", () => ({
  leaveBalanceService: { deductBalance: mocks.deductBalance },
}));

import { approvalService } from "@/services/approval-service";

const requestId = "33333333-3333-4333-8333-333333333333";
const employeeId = "11111111-1111-4111-8111-111111111111";
const managerId = "22222222-2222-4222-8222-222222222222";
const departmentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function pendingRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: requestId,
    requesterId: employeeId,
    leaveTypeId: "44444444-4444-4444-8444-444444444444",
    startDate: new Date("2026-08-01T00:00:00.000Z"),
    requestedDays: 2,
    status: "PENDING",
    requester: {
      id: employeeId,
      managerId,
      departmentId,
    },
    ...overrides,
  };
}

beforeEach(() => {
  mocks.transaction.mockImplementation(
    async (
      input:
        | Array<Promise<unknown>>
        | ((client: typeof transactionClient) => Promise<unknown>),
    ) => Array.isArray(input) ? Promise.all(input) : input(transactionClient),
  );
  mocks.requestFindUnique.mockResolvedValue(pendingRequest());
  mocks.deductBalance.mockResolvedValue({});
  mocks.approvalCreate.mockResolvedValue({ id: "approval", status: "APPROVED" });
  mocks.requestUpdate.mockResolvedValue({ id: requestId, status: "APPROVED" });
  mocks.requestCount.mockResolvedValue(1);
  mocks.requestFindMany.mockResolvedValue([pendingRequest()]);
});

describe("approval authorization", () => {
  it("prevents employees from approving requests", async () => {
    await expect(
      approvalService.approveRequest(createActor(), requestId),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("prevents self-approval", async () => {
    mocks.requestFindUnique.mockResolvedValue(
      pendingRequest({
        requesterId: managerId,
        requester: { id: managerId, managerId: null, departmentId },
      }),
    );
    const manager = createActor({ id: managerId, role: "MANAGER", departmentId });

    await expect(
      approvalService.approveRequest(manager, requestId),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("rejects a manager outside direct-report scope", async () => {
    const manager = createActor({
      id: "66666666-6666-4666-8666-666666666666",
      role: "MANAGER",
      departmentId,
    });

    await expect(
      approvalService.approveRequest(manager, requestId),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("rejects a direct report from another department", async () => {
    mocks.requestFindUnique.mockResolvedValue(
      pendingRequest({
        requester: {
          id: employeeId,
          managerId,
          departmentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      }),
    );
    const manager = createActor({ id: managerId, role: "MANAGER", departmentId });

    await expect(
      approvalService.approveRequest(manager, requestId),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("allows a manager to approve a same-department direct report", async () => {
    const manager = createActor({ id: managerId, role: "MANAGER", departmentId });

    await approvalService.approveRequest(manager, requestId);

    expect(mocks.approvalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ approverId: managerId }),
      }),
    );
    expect(mocks.deductBalance).toHaveBeenCalledOnce();
  });

  it.each(["HR", "ADMIN"] as const)(
    "allows %s to approve organization-wide requests",
    async (role) => {
      await expect(
        approvalService.approveRequest(
          createActor({
            id: "77777777-7777-4777-8777-777777777777",
            role,
          }),
          requestId,
        ),
      ).resolves.toMatchObject({ request: { status: "APPROVED" } });
      expect(mocks.deductBalance).toHaveBeenCalledOnce();
    },
  );

  it.each(["HR", "ADMIN"] as const)(
    "allows %s to reject without deducting balance",
    async (role) => {
      mocks.requestUpdate.mockResolvedValue({ id: requestId, status: "REJECTED" });
      const actor = createActor({
        id: "77777777-7777-4777-8777-777777777777",
        role,
      });

      await expect(
        approvalService.rejectRequest(actor, requestId, "Not approved"),
      ).resolves.toMatchObject({ request: { status: "REJECTED" } });
      expect(mocks.deductBalance).not.toHaveBeenCalled();
      expect(mocks.approvalCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approverId: actor.id,
            status: "REJECTED",
            comment: "Not approved",
          }),
        }),
      );
    },
  );

  it("prevents HR from rejecting their own request", async () => {
    const hr = createActor({
      id: "77777777-7777-4777-8777-777777777777",
      role: "HR",
    });
    mocks.requestFindUnique.mockResolvedValue(
      pendingRequest({
        requesterId: hr.id,
        requester: { id: hr.id, managerId: null, departmentId: null },
      }),
    );

    await expect(
      approvalService.rejectRequest(hr, requestId, "Rejected"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("limits a manager queue to non-self direct reports in their department", async () => {
    const manager = createActor({ id: managerId, role: "MANAGER", departmentId });

    await approvalService.getPendingRequests(manager, { page: 1, pageSize: 20 });

    expect(mocks.requestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterId: { not: manager.id },
          requester: {
            is: {
              managerId: manager.id,
              departmentId,
              isActive: true,
            },
          },
        }),
      }),
    );
  });

  it("excludes an HR or Admin actor's own requests from their queue", async () => {
    const actor = createActor({
      id: "77777777-7777-4777-8777-777777777777",
      role: "ADMIN",
    });

    await approvalService.getPendingRequests(actor, { page: 1, pageSize: 20 });

    expect(mocks.requestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ requesterId: { not: actor.id } }),
      }),
    );
  });

  it("does not record or update approval when balance is insufficient", async () => {
    mocks.deductBalance.mockRejectedValue(new InsufficientLeaveBalanceError());
    const actor = createActor({
      id: "77777777-7777-4777-8777-777777777777",
      role: "HR",
    });

    await expect(
      approvalService.approveRequest(actor, requestId),
    ).rejects.toBeInstanceOf(InsufficientLeaveBalanceError);
    expect(mocks.approvalCreate).not.toHaveBeenCalled();
    expect(mocks.requestUpdate).not.toHaveBeenCalled();
  });

  it("maps a concurrent transaction failure to a domain conflict", async () => {
    mocks.transaction.mockRejectedValue({ code: "P2034" });
    const actor = createActor({
      id: "77777777-7777-4777-8777-777777777777",
      role: "ADMIN",
    });

    await expect(
      approvalService.approveRequest(actor, requestId),
    ).rejects.toBeInstanceOf(LeaveRequestConflictError);
  });

  it.each(["approve", "reject"])(
    "blocks repeated %s decisions",
    async (action) => {
      mocks.requestFindUnique.mockResolvedValue(
        pendingRequest({ status: "APPROVED" }),
      );
      const actor = createActor({
        id: "77777777-7777-4777-8777-777777777777",
        role: "HR",
      });

      const operation =
        action === "approve"
          ? approvalService.approveRequest(actor, requestId)
          : approvalService.rejectRequest(actor, requestId, "Rejected");

      await expect(operation).rejects.toBeInstanceOf(LeaveRequestConflictError);
    },
  );
});
