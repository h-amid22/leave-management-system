import type { UserRole } from "@/generated/prisma/enums";
import type { LeaveBalance, PaginationMeta } from "@/lib/api/types";

export interface AdminEmployee {
  id: string; email: string; name: string; role: UserRole; employeeNumber: string | null;
  isActive: boolean; departmentId: string | null; managerId: string | null;
  createdAt: string; updatedAt: string;
  department: { id: string; name: string } | null;
  manager: { id: string; name: string } | null;
}
export interface AdminEmployeeDetail extends AdminEmployee {
  authenticationLinked: boolean;
  leaveBalances: LeaveBalance[];
  leaveRequests: Array<{ id: string; startDate: string; endDate: string; requestedDays: string; status: string; leaveType: { name: string } }>;
  currentPolicies: Array<{ id: string; name: string; allowanceDays: string; leaveType: { id: string; name: string } }>;
}
export interface AdminDepartment { id: string; name: string; description: string | null; isActive: boolean; createdAt: string; _count: { users: number }; }
export interface AdminLeaveType { id: string; code: string; name: string; description: string | null; isPaid: boolean; isActive: boolean; createdAt: string; _count: { policies: number; balances: number; requests: number }; }
export interface AdminPolicy { id: string; name: string; allowanceDays: string; maximumCarryOver: string; allowNegative: boolean; effectiveFrom: string; effectiveTo: string | null; status: "CURRENT" | "UPCOMING" | "HISTORICAL"; affectedEmployees: number; leaveType: { id: string; code: string; name: string; isPaid: boolean; isActive: boolean }; }
export interface AdminBalance { id: string; year: number; entitledDays: string; carriedDays: string; usedDays: string; remainingDays: string; updatedAt: string; requiresAttention: boolean; user: { id: string; name: string; email: string; department: { id: string; name: string } | null }; leaveType: { id: string; code: string; name: string }; }
export interface AdminSummary { metrics: { activeEmployees: number; pendingRequests: number; approvedThisMonth: number; rejectedThisMonth: number; currentlyOnLeave: number; activePolicies: number; balancesAttention: number }; employeesByRole: Array<{ label: string; value: number }>; employeesByDepartment: Array<{ label: string; value: number }>; requestsByLeaveType: Array<{ label: string; value: number }>; }
export interface AdminPage<T> { data: T[]; meta: PaginationMeta; }
export interface EmployeePayload { email: string; name: string; role: UserRole; departmentId?: string | null; managerId?: string | null; isActive: boolean; }
export interface PolicyPayload { name: string; leaveTypeId: string; allowanceDays: number; maximumCarryOver: number; allowNegative: boolean; effectiveFrom: string; effectiveTo?: string | null; }
