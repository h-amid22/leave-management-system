// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { createLeaveRequestFixture } from "@/tests/support/leave-request";

const mocks = vi.hoisted(() => ({
  getLeaveRequest: vi.fn(),
  getCurrentUser: vi.fn(),
  getBalances: vi.fn(),
  getUserBalances: vi.fn(),
  cancelLeaveRequest: vi.fn(),
  approveLeaveRequest: vi.fn(),
  rejectLeaveRequest: vi.fn(),
}));

vi.mock("@/lib/api/leave-api", () => ({ leaveApi: mocks }));

import { RequestDetails } from "@/components/leave/request-details";

const request = createLeaveRequestFixture();

beforeEach(() => {
  mocks.getLeaveRequest.mockResolvedValue(request);
  mocks.getCurrentUser.mockResolvedValue({
    id: request.requester.id,
    email: request.requester.email,
    name: request.requester.name,
    role: "EMPLOYEE",
    departmentId: request.requester.department?.id ?? null,
    managerId: request.requester.manager?.id ?? null,
  });
  mocks.getBalances.mockResolvedValue([]);
  mocks.getUserBalances.mockResolvedValue([]);
});

describe("request detail approval controls", () => {
  it("shows owner controls but never self-approval controls", async () => {
    render(<RequestDetails requestId={request.id} />);

    expect(await screen.findByRole("link", { name: /edit request/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel leave request/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it.each(["MANAGER", "HR", "ADMIN"] as const)(
    "shows decision controls to an authorized %s viewer",
    async (role) => {
      mocks.getCurrentUser.mockResolvedValue({
        id: "77777777-7777-4777-8777-777777777777",
        email: `${role.toLowerCase()}@leave.example`,
        name: `${role} User`,
        role,
        departmentId: request.requester.department?.id ?? null,
        managerId: null,
      });
      render(<RequestDetails requestId={request.id} />);

      expect(await screen.findByRole("button", { name: "Approve" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /edit request/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cancel leave request/i })).not.toBeInTheDocument();
    },
  );

  it("does not expose controls when the API rejects request access", async () => {
    mocks.getLeaveRequest.mockRejectedValue(new ApiError("Forbidden", 403));
    render(<RequestDetails requestId={request.id} />);

    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /edit request/i })).not.toBeInTheDocument();
  });
});
