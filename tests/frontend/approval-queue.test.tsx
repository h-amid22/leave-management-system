// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { createLeaveRequestFixture } from "@/tests/support/leave-request";

const mocks = vi.hoisted(() => ({
  getPendingApprovals: vi.fn(),
  approveLeaveRequest: vi.fn(),
  rejectLeaveRequest: vi.fn(),
}));

vi.mock("@/lib/api/leave-api", () => ({
  leaveApi: {
    getPendingApprovals: mocks.getPendingApprovals,
    approveLeaveRequest: mocks.approveLeaveRequest,
    rejectLeaveRequest: mocks.rejectLeaveRequest,
  },
}));

import { ApprovalQueue } from "@/components/approvals/approval-queue";

const pendingRequest = createLeaveRequestFixture();

function response(data = [pendingRequest]) {
  return {
    data,
    meta: { page: 1, pageSize: 100, total: data.length, totalPages: data.length ? 1 : 0 },
  };
}

beforeEach(() => {
  mocks.getPendingApprovals.mockResolvedValue(response());
  mocks.approveLeaveRequest.mockResolvedValue({});
  mocks.rejectLeaveRequest.mockResolvedValue({});
});

describe("approval queue", () => {
  it("shows loading and then an empty queue", async () => {
    mocks.getPendingApprovals.mockResolvedValue(response([]));
    render(<ApprovalQueue />);

    expect(screen.getByText("Loading pending approvals…")).toBeInTheDocument();
    expect(await screen.findByText("No requests awaiting review")).toBeInTheDocument();
  });

  it("shows a safe session-expiry error", async () => {
    mocks.getPendingApprovals.mockRejectedValue(new ApiError("Authentication required", 401));
    render(<ApprovalQueue />);

    expect(await screen.findByText("Your session has expired. Sign in again to continue.")).toBeInTheDocument();
  });

  it("requires a rejection reason and removes a request after success", async () => {
    const user = userEvent.setup();
    render(<ApprovalQueue />);
    await screen.findByText("Test Employee");

    await user.click(screen.getByRole("button", { name: "Reject" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirm rejection" }));
    expect(within(dialog).getByText("Enter a reason for rejecting this request.")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Rejection reason"), "Coverage is unavailable");
    await user.click(within(dialog).getByRole("button", { name: "Confirm rejection" }));

    await waitFor(() => expect(mocks.rejectLeaveRequest).toHaveBeenCalledWith(pendingRequest.id, "Coverage is unavailable"));
    expect(await screen.findByText("Test Employee’s request was rejected.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View details" })).not.toBeInTheDocument();
  });

  it("prevents duplicate approval submissions", async () => {
    let resolveApproval: (() => void) | undefined;
    mocks.approveLeaveRequest.mockReturnValue(new Promise<void>((resolve) => { resolveApproval = resolve; }));
    const user = userEvent.setup();
    render(<ApprovalQueue />);
    await screen.findByText("Test Employee");

    await user.click(screen.getByRole("button", { name: "Approve" }));
    const confirm = within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm approval" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(mocks.approveLeaveRequest).toHaveBeenCalledOnce();
    resolveApproval?.();
    await waitFor(() => expect(screen.getByText("Test Employee’s request was approved.")).toBeInTheDocument());
  });

  it("refreshes stale data after a conflict", async () => {
    mocks.approveLeaveRequest.mockRejectedValue(new ApiError("Already processed", 409));
    mocks.getPendingApprovals
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response([]));
    const user = userEvent.setup();
    render(<ApprovalQueue />);
    await screen.findByText("Test Employee");

    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm approval" }));

    expect(await screen.findByText("This request was already processed or changed. The queue has been refreshed.")).toBeInTheDocument();
    expect(mocks.getPendingApprovals).toHaveBeenCalledTimes(2);
  });
});
