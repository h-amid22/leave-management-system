import { apiRequest, createQueryString } from "@/lib/api/client";
import type { ApiSuccess, PaginatedApiSuccess } from "@/lib/api/types";
import type { AdminBalance, AdminDepartment, AdminEmployee, AdminEmployeeDetail, AdminLeaveType, AdminPolicy, AdminSummary, EmployeePayload, PolicyPayload } from "@/lib/api/admin-types";

export const adminApi = {
  async getSummary() { return (await apiRequest<ApiSuccess<AdminSummary>>("/api/admin/summary")).data; },
  async getEmployees(query: object = {}) { return apiRequest<PaginatedApiSuccess<AdminEmployee>>(`/api/admin/employees${createQueryString(query)}`); },
  async getEmployee(id: string) { return (await apiRequest<ApiSuccess<AdminEmployeeDetail>>(`/api/admin/employees/${encodeURIComponent(id)}`)).data; },
  async createEmployee(input: EmployeePayload) { return (await apiRequest<ApiSuccess<AdminEmployee>>("/api/admin/employees", { method: "POST", body: JSON.stringify(input) })).data; },
  async updateEmployee(id: string, input: Partial<Omit<EmployeePayload, "email">>) { return (await apiRequest<ApiSuccess<AdminEmployee>>(`/api/admin/employees/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) })).data; },
  async deactivateEmployee(id: string) { return (await apiRequest<ApiSuccess<AdminEmployee>>(`/api/admin/employees/${encodeURIComponent(id)}/deactivate`, { method: "POST" })).data; },
  async getDepartments() { return (await apiRequest<ApiSuccess<AdminDepartment[]>>("/api/admin/departments")).data; },
  async createDepartment(input: { name: string; description?: string | null }) { return (await apiRequest<ApiSuccess<AdminDepartment>>("/api/admin/departments", { method: "POST", body: JSON.stringify(input) })).data; },
  async updateDepartment(id: string, input: Partial<Pick<AdminDepartment, "name" | "description" | "isActive">>) { return (await apiRequest<ApiSuccess<AdminDepartment>>(`/api/admin/departments/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) })).data; },
  async getLeaveTypes() { return (await apiRequest<ApiSuccess<AdminLeaveType[]>>("/api/admin/leave-types")).data; },
  async createLeaveType(input: { code: string; name: string; description?: string | null; isPaid: boolean; isActive: boolean }) { return (await apiRequest<ApiSuccess<AdminLeaveType>>("/api/admin/leave-types", { method: "POST", body: JSON.stringify(input) })).data; },
  async updateLeaveType(id: string, input: Partial<Pick<AdminLeaveType, "name" | "description" | "isPaid" | "isActive">>) { return (await apiRequest<ApiSuccess<AdminLeaveType>>(`/api/admin/leave-types/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) })).data; },
  async getPolicies(query: object = {}) { return apiRequest<PaginatedApiSuccess<AdminPolicy>>(`/api/admin/policies${createQueryString(query)}`); },
  async createPolicy(input: PolicyPayload) { return (await apiRequest<ApiSuccess<AdminPolicy>>("/api/admin/policies", { method: "POST", body: JSON.stringify(input) })).data; },
  async updatePolicy(id: string, input: Partial<Omit<PolicyPayload, "leaveTypeId">>) { return (await apiRequest<ApiSuccess<AdminPolicy>>(`/api/admin/policies/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) })).data; },
  async getBalances(query: object = {}) { return apiRequest<PaginatedApiSuccess<AdminBalance>>(`/api/admin/balances${createQueryString(query)}`); },
  async initializeBalances(year: number, preview: boolean) { return (await apiRequest<ApiSuccess<{ year: number; activeEmployees: number; policiesApplied: number; toCreate: number; unchanged: number; created: number; preview: boolean }>>("/api/admin/balances/initialize", { method: "POST", body: JSON.stringify({ year, preview }) })).data; },
};
