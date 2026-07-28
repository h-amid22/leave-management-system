import type { LeaveRequest } from "@/lib/api/types";

export function createLeaveRequestFixture(
  overrides: Partial<LeaveRequest> = {},
): LeaveRequest {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    leaveTypeId: "44444444-4444-4444-8444-444444444444",
    startDate: "2099-08-01T00:00:00.000Z",
    endDate: "2099-08-02T00:00:00.000Z",
    requestedDays: "2",
    reason: "Personal leave",
    status: "PENDING",
    submittedAt: "2099-07-01T00:00:00.000Z",
    decidedAt: null,
    cancelledAt: null,
    updatedAt: "2099-07-01T00:00:00.000Z",
    requester: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Test Employee",
      email: "employee@leave.example",
      role: "EMPLOYEE",
      department: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Engineering",
      },
      manager: {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Test Manager",
      },
    },
    leaveType: {
      id: "44444444-4444-4444-8444-444444444444",
      code: "ANNUAL",
      name: "Annual Leave",
      description: "Paid leave",
      isPaid: true,
    },
    approvals: [],
    ...overrides,
  };
}
