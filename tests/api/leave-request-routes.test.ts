import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationError } from "@/lib/auth/errors";
import {
  InsufficientLeaveBalanceError,
  LeavePolicyNotFoundError,
  LeaveRequestConflictError,
} from "@/services/leave-domain-errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  createLeaveRequest: vi.fn(),
  getRequestHistory: vi.fn(),
  getRequestById: vi.fn(),
  updatePendingRequest: vi.fn(),
  cancelPendingRequest: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/services/leave-request-service", () => ({
  leaveRequestService: {
    createLeaveRequest: mocks.createLeaveRequest,
    getRequestHistory: mocks.getRequestHistory,
    getRequestById: mocks.getRequestById,
    updatePendingRequest: mocks.updatePendingRequest,
    cancelPendingRequest: mocks.cancelPendingRequest,
  },
}));
vi.mock("@/services/audit-service", () => ({ auditService: { record: vi.fn() } }));

import { GET as getCollection, POST as createRequest } from "@/app/api/leave-requests/route";
import {
  GET as getRequest,
  PATCH as updateRequest,
} from "@/app/api/leave-requests/[id]/route";

const validId = "33333333-3333-4333-8333-333333333333";
const validLeaveTypeId = "44444444-4444-4444-8444-444444444444";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/leave-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.requireCurrentUser.mockResolvedValue(createActor());
  mocks.createLeaveRequest.mockResolvedValue({ id: validId, status: "PENDING" });
  mocks.getRequestHistory.mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  });
});

describe("leave-request route authentication and validation", () => {
  it("returns 401 when the session is missing", async () => {
    mocks.requireCurrentUser.mockRejectedValue(new AuthenticationError());

    const response = await getCollection(
      new Request("http://localhost/api/leave-requests"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await createRequest(
      new Request("http://localhost/api/leave-requests", {
        method: "POST",
        body: "{broken",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createLeaveRequest).not.toHaveBeenCalled();
  });

  it("rejects unknown fields and client-supplied employee IDs", async () => {
    const response = await createRequest(
      jsonRequest({
        leaveTypeId: validLeaveTypeId,
        startDate: "2026-08-01",
        endDate: "2026-08-02",
        employeeId: validId,
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createLeaveRequest).not.toHaveBeenCalled();
  });

  it("rejects invalid UUID route parameters", async () => {
    const response = await getRequest(new Request("http://localhost"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.getRequestById).not.toHaveBeenCalled();
  });

  it("enforces the maximum page size", async () => {
    const response = await getCollection(
      new Request("http://localhost/api/leave-requests?pageSize=101"),
    );

    expect(response.status).toBe(400);
    expect(mocks.getRequestHistory).not.toHaveBeenCalled();
  });
});

describe("leave-request route domain error mapping", () => {
  const validBody = {
    leaveTypeId: validLeaveTypeId,
    startDate: "2026-08-01",
    endDate: "2026-08-02",
  };

  it.each([
    [new LeaveRequestConflictError("overlap"), "LEAVE_REQUEST_CONFLICT"],
    [new InsufficientLeaveBalanceError(), "INSUFFICIENT_LEAVE_BALANCE"],
    [new LeavePolicyNotFoundError(), "LEAVE_POLICY_NOT_FOUND"],
  ])("maps expected conflicts to 409", async (error, code) => {
    mocks.createLeaveRequest.mockRejectedValue(error);

    const response = await createRequest(jsonRequest(validBody));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe(code);
  });

  it("returns 409 when an approved request is edited", async () => {
    mocks.updatePendingRequest.mockRejectedValue(
      new LeaveRequestConflictError("Only pending leave requests can be edited"),
    );

    const response = await updateRequest(
      new Request(`http://localhost/api/leave-requests/${validId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Changed" }),
      }),
      { params: Promise.resolve({ id: validId }) },
    );

    expect(response.status).toBe(409);
  });
});
