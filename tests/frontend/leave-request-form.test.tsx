// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { createLeaveRequestFixture } from "@/tests/support/leave-request";

const mocks = vi.hoisted(() => ({
  getLeaveTypes: vi.fn(),
  createLeaveRequest: vi.fn(),
  updateLeaveRequest: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh, back: mocks.back }),
}));

vi.mock("@/lib/api/leave-api", () => ({
  leaveApi: {
    getLeaveTypes: mocks.getLeaveTypes,
    createLeaveRequest: mocks.createLeaveRequest,
    updateLeaveRequest: mocks.updateLeaveRequest,
  },
}));

import {
  LeaveRequestForm,
  validateLeaveRequestForm,
} from "@/components/leave/leave-request-form";

const annualType = {
  id: "44444444-4444-4444-8444-444444444444",
  code: "ANNUAL",
  name: "Annual Leave",
  description: "Paid leave",
  isPaid: true,
};

beforeEach(() => {
  mocks.getLeaveTypes.mockResolvedValue([annualType]);
  mocks.createLeaveRequest.mockResolvedValue(createLeaveRequestFixture());
});

async function fillValidForm() {
  const user = userEvent.setup();
  await screen.findByRole("option", { name: "Annual Leave" });
  await user.selectOptions(screen.getByLabelText("Leave type"), annualType.id);
  await user.type(screen.getByLabelText("Start date"), "2099-08-01");
  await user.type(screen.getByLabelText("End date"), "2099-08-02");
  await user.type(screen.getByLabelText("Reason"), "Family event");
  return user;
}

describe("leave request form", () => {
  it("validates missing, past, and reversed dates", () => {
    expect(validateLeaveRequestForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" }, "2026-07-23")).toBe("Select a leave type.");
    expect(validateLeaveRequestForm({ leaveTypeId: annualType.id, startDate: "2026-07-22", endDate: "2026-07-24", reason: "" }, "2026-07-23")).toBe("The start date cannot be in the past.");
    expect(validateLeaveRequestForm({ leaveTypeId: annualType.id, startDate: "2026-07-25", endDate: "2026-07-24", reason: "" }, "2026-07-23")).toBe("The end date cannot be before the start date.");
  });

  it("submits a valid request and redirects to its details", async () => {
    render(<LeaveRequestForm mode="create" />);
    const user = await fillValidForm();

    await user.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => expect(mocks.createLeaveRequest).toHaveBeenCalledOnce());
    expect(mocks.createLeaveRequest).toHaveBeenCalledWith({
      leaveTypeId: annualType.id,
      startDate: "2099-08-01",
      endDate: "2099-08-02",
      reason: "Family event",
    });
    expect(mocks.push).toHaveBeenCalledWith(
      "/leave/33333333-3333-4333-8333-333333333333",
    );
  });

  it("prevents duplicate submissions while a request is pending", async () => {
    let resolveRequest: ((value: ReturnType<typeof createLeaveRequestFixture>) => void) | undefined;
    mocks.createLeaveRequest.mockReturnValue(
      new Promise((resolve) => { resolveRequest = resolve; }),
    );
    render(<LeaveRequestForm mode="create" />);
    await fillValidForm();
    const form = screen.getByRole("button", { name: /submit request/i }).closest("form");
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(mocks.createLeaveRequest).toHaveBeenCalledOnce();
    resolveRequest?.(createLeaveRequestFixture());
    await waitFor(() => expect(mocks.push).toHaveBeenCalled());
  });

  it("shows safe API errors", async () => {
    mocks.createLeaveRequest.mockRejectedValue(
      new ApiError("The requested dates overlap an existing leave request", 409),
    );
    render(<LeaveRequestForm mode="create" />);
    const user = await fillValidForm();

    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The requested dates overlap an existing leave request",
    );
  });
});
