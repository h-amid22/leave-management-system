import { apiRequest, createQueryString } from "@/lib/api/client";
import type {
  ApiSuccess,
  CurrentUser,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestInput,
  LeaveRequestQuery,
  LeaveType,
  PendingApprovalRequest,
  PaginatedApiSuccess,
} from "@/lib/api/types";

export const leaveApi = {
  async getCurrentUser() {
    const response = await apiRequest<ApiSuccess<CurrentUser>>("/api/auth/me");
    return response.data;
  },

  async getBalances() {
    const response = await apiRequest<ApiSuccess<LeaveBalance[]>>(
      "/api/leave-balances",
    );
    return response.data;
  },

  async getUserBalances(userId: string) {
    const response = await apiRequest<ApiSuccess<LeaveBalance[]>>(
      `/api/users/${encodeURIComponent(userId)}/leave-balances`,
    );
    return response.data;
  },

  async getLeaveTypes() {
    const response = await apiRequest<ApiSuccess<LeaveType[]>>("/api/leave-types");
    return response.data;
  },

  async getLeaveRequests(query: LeaveRequestQuery = {}) {
    return apiRequest<PaginatedApiSuccess<LeaveRequest>>(
      `/api/leave-requests${createQueryString(query)}`,
    );
  },

  async getLeaveRequest(id: string) {
    const response = await apiRequest<ApiSuccess<LeaveRequest>>(
      `/api/leave-requests/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  async createLeaveRequest(input: LeaveRequestInput) {
    const response = await apiRequest<ApiSuccess<LeaveRequest>>(
      "/api/leave-requests",
      { method: "POST", body: JSON.stringify(input) },
    );
    return response.data;
  },

  async updateLeaveRequest(id: string, input: LeaveRequestInput) {
    const response = await apiRequest<ApiSuccess<LeaveRequest>>(
      `/api/leave-requests/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
    return response.data;
  },

  async cancelLeaveRequest(id: string) {
    const response = await apiRequest<ApiSuccess<LeaveRequest>>(
      `/api/leave-requests/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.data;
  },

  async getPendingApprovals(query: Pick<LeaveRequestQuery, "page" | "pageSize"> = {}) {
    return apiRequest<PaginatedApiSuccess<PendingApprovalRequest>>(
      `/api/approvals/pending${createQueryString(query)}`,
    );
  },

  async approveLeaveRequest(id: string, comment?: string) {
    const response = await apiRequest<ApiSuccess<unknown>>(
      `/api/leave-requests/${encodeURIComponent(id)}/approve`,
      { method: "POST", body: JSON.stringify({ comment: comment?.trim() || null }) },
    );
    return response.data;
  },

  async rejectLeaveRequest(id: string, comment: string) {
    const response = await apiRequest<ApiSuccess<unknown>>(
      `/api/leave-requests/${encodeURIComponent(id)}/reject`,
      { method: "POST", body: JSON.stringify({ comment: comment.trim() }) },
    );
    return response.data;
  },
};
