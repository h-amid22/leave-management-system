import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/audit-service", () => ({ auditService: { record: vi.fn() } }));

import { AuthorizationError } from "@/lib/auth/errors";
import { LeaveRequestConflictError } from "@/services/leave-domain-errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/services/approval-service", () => ({
  approvalService: {
    approveRequest: mocks.approveRequest,
    rejectRequest: mocks.rejectRequest,
  },
}));

import { POST as approve } from "@/app/api/leave-requests/[id]/approve/route";
import { POST as reject } from "@/app/api/leave-requests/[id]/reject/route";

const requestId = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  mocks.requireCurrentUser.mockResolvedValue(createActor());
  mocks.approveRequest.mockResolvedValue({});
  mocks.rejectRequest.mockResolvedValue({});
});

describe("approval routes", () => {
  it("forbids employees from approving requests", async () => {
    const response = await approve(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ id: requestId }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.approveRequest).not.toHaveBeenCalled();
  });

  it("forbids employees from rejecting requests", async () => {
    const response = await reject(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ comment: "Rejected" }),
      }),
      { params: Promise.resolve({ id: requestId }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.rejectRequest).not.toHaveBeenCalled();
  });

  it("returns 403 when the service blocks self-approval", async () => {
    mocks.requireCurrentUser.mockResolvedValue(createActor({ role: "MANAGER" }));
    mocks.approveRequest.mockRejectedValue(
      new AuthorizationError("Users cannot approve their own leave"),
    );

    const response = await approve(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ id: requestId }) },
    );

    expect(response.status).toBe(403);
  });

  it.each(["approve", "reject"])(
    "returns 409 for repeated %s actions",
    async (action) => {
      mocks.requireCurrentUser.mockResolvedValue(createActor({ role: "HR" }));
      const conflict = new LeaveRequestConflictError("Already processed");

      if (action === "approve") {
        mocks.approveRequest.mockRejectedValue(conflict);
        const response = await approve(
          new Request("http://localhost", { method: "POST" }),
          { params: Promise.resolve({ id: requestId }) },
        );
        expect(response.status).toBe(409);
      } else {
        mocks.rejectRequest.mockRejectedValue(conflict);
        const response = await reject(
          new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ comment: "Rejected" }),
          }),
          { params: Promise.resolve({ id: requestId }) },
        );
        expect(response.status).toBe(409);
      }
    },
  );
});
