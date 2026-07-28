// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createLeaveRequestFixture } from "@/tests/support/leave-request";

const mocks = vi.hoisted(() => ({
  getLeaveRequests: vi.fn(),
  cancelLeaveRequest: vi.fn(),
}));

vi.mock("@/lib/api/leave-api", () => ({
  leaveApi: {
    getLeaveRequests: mocks.getLeaveRequests,
    cancelLeaveRequest: mocks.cancelLeaveRequest,
  },
}));

import { RequestActions } from "@/components/leave/request-actions";
import { RequestHistory } from "@/components/leave/request-history";

beforeEach(() => {
  mocks.getLeaveRequests.mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
  });
});

describe("request history presentation authorization", () => {
  it("shows edit and cancel controls for pending requests", () => {
    render(<RequestActions request={createLeaveRequestFixture()} onCancel={vi.fn()} />);

    expect(screen.getByRole("link", { name: /edit annual leave request/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel annual leave request/i })).toBeInTheDocument();
  });

  it.each(["APPROVED", "REJECTED"] as const)(
    "does not show mutation controls for %s requests",
    (status) => {
      const { container } = render(
        <RequestActions request={createLeaveRequestFixture({ status })} onCancel={vi.fn()} />,
      );
      expect(container).toBeEmptyDOMElement();
    },
  );

  it("shows a clear empty history state", async () => {
    render(<RequestHistory />);

    expect(await screen.findByText("No leave requests yet")).toBeInTheDocument();
  });
});
