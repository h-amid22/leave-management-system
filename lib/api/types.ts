import type { LeaveRequestStatus, UserRole } from "@/generated/prisma/enums";

export interface ApiSuccess<T> {
  data: T;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiSuccess<T> extends ApiSuccess<T[]> {
  meta: PaginationMeta;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId: string | null;
  managerId: string | null;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isPaid: boolean;
}

export interface LeaveBalance {
  id: string;
  year: number;
  entitledDays: string;
  carriedDays: string;
  usedDays: string;
  remainingDays: string;
  leaveType: Pick<LeaveType, "id" | "code" | "name" | "isPaid">;
}

export interface LeaveApproval {
  id: string;
  step: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
  comment: string | null;
  decidedAt: string | null;
  approver: {
    id: string;
    name: string;
    role: UserRole;
  };
}

export interface LeaveRequest {
  id: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestedDays: string;
  reason: string | null;
  status: LeaveRequestStatus;
  submittedAt: string;
  decidedAt: string | null;
  cancelledAt: string | null;
  updatedAt: string;
  requester: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department: { id: string; name: string } | null;
    manager: { id: string; name: string } | null;
  };
  leaveType: LeaveType;
  approvals: LeaveApproval[];
}

export interface LeaveRequestInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
}

export interface LeaveRequestQuery {
  page?: number;
  pageSize?: number;
  status?: LeaveRequestStatus;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PendingApprovalRequest {
  id: string;
  startDate: string;
  endDate: string;
  requestedDays: string;
  reason: string | null;
  status: LeaveRequestStatus;
  submittedAt: string;
  decidedAt: string | null;
  requester: LeaveRequest["requester"];
  leaveType: LeaveType;
  approvals: LeaveApproval[];
}
