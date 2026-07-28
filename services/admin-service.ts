import "server-only";

import { db } from "@/db";
import { Prisma } from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { requireRole } from "@/lib/auth/authorization";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminConflictError, AdminNotFoundError, AdminValidationError, ProvisioningError } from "@/services/admin-domain-errors";
import { createPaginationMeta, type PaginationInput } from "@/services/service-types";

const adminRoles = ["ADMIN"] as const;
const employeeSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  employeeNumber: true,
  isActive: true,
  departmentId: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
} as const;

interface EmployeeFilters extends PaginationInput {
  search?: string;
  role?: "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";
  departmentId?: string;
  isActive?: boolean;
  sort: "name" | "email" | "createdAt" | "role";
  order: "asc" | "desc";
}

export interface EmployeeInput {
  email: string;
  name: string;
  role: "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";
  departmentId?: string | null;
  managerId?: string | null;
  isActive: boolean;
}

export interface EmployeeUpdateInput extends Partial<Omit<EmployeeInput, "email">> {}

export interface PolicyInput {
  name: string;
  leaveTypeId: string;
  allowanceDays: number;
  maximumCarryOver: number;
  allowNegative: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

function requireAdmin(actor: AuthenticatedUser) {
  return requireRole(actor, adminRoles);
}

function normalizeNullable(value: string | null | undefined) {
  return value || null;
}

async function validateAssignments(input: { departmentId?: string | null; managerId?: string | null }, userId?: string) {
  const departmentId = normalizeNullable(input.departmentId);
  const managerId = normalizeNullable(input.managerId);

  if (departmentId) {
    const department = await db.department.findFirst({ where: { id: departmentId, isActive: true }, select: { id: true } });
    if (!department) throw new AdminValidationError("Department is invalid or inactive");
  }

  if (!managerId) return;
  if (managerId === userId) throw new AdminValidationError("An employee cannot manage themselves");

  const manager = await db.user.findFirst({
    where: { id: managerId, isActive: true, role: "MANAGER" },
    select: { id: true, departmentId: true, managerId: true },
  });
  if (!manager) throw new AdminValidationError("Manager is invalid, inactive, or does not have the Manager role");
  if (!departmentId || manager.departmentId !== departmentId) {
    throw new AdminValidationError("Manager and employee must belong to the same department");
  }

  if (userId) {
    let ancestorId: string | null = manager.managerId;
    const visited = new Set<string>([manager.id]);
    while (ancestorId) {
      if (ancestorId === userId) throw new AdminValidationError("Manager assignment would create a circular reporting line");
      if (visited.has(ancestorId)) throw new AdminValidationError("The existing reporting line contains a cycle");
      visited.add(ancestorId);
      const ancestor: { managerId: string | null } | null = await db.user.findUnique({ where: { id: ancestorId }, select: { managerId: true } });
      ancestorId = ancestor?.managerId ?? null;
    }
  }
}

async function ensurePolicyDoesNotOverlap(input: Pick<PolicyInput, "leaveTypeId" | "effectiveFrom" | "effectiveTo">, excludedId?: string) {
  const overlap = await db.leavePolicy.findFirst({
    where: {
      id: excludedId ? { not: excludedId } : undefined,
      leaveTypeId: input.leaveTypeId,
      effectiveFrom: input.effectiveTo ? { lte: input.effectiveTo } : undefined,
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.effectiveFrom } }],
    },
    select: { id: true },
  });
  if (overlap) throw new AdminConflictError("Policy dates overlap an existing policy for this leave type");
}

async function initializeUserBalances(userId: string, year: number, database: Prisma.TransactionClient) {
  const effectiveDate = new Date(Date.UTC(year, 0, 1));
  const policies = await database.leavePolicy.findMany({
    where: {
      effectiveFrom: { lte: effectiveDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }],
      leaveType: { isActive: true },
    },
    select: { leaveTypeId: true, allowanceDays: true },
    orderBy: { effectiveFrom: "desc" },
  });
  const uniquePolicies = Array.from(new Map(policies.map((policy) => [policy.leaveTypeId, policy])).values());
  if (!uniquePolicies.length) return 0;
  const result = await database.leaveBalance.createMany({
    data: uniquePolicies.map((policy) => ({
      userId,
      leaveTypeId: policy.leaveTypeId,
      year,
      entitledDays: policy.allowanceDays,
      carriedDays: 0,
      usedDays: 0,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

export const adminService = {
  async getSummary(actor: AuthenticatedUser) {
    requireAdmin(actor);
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const [activeEmployees, usersByRole, usersByDepartment, pendingRequests, approvedThisMonth, rejectedThisMonth, currentlyOnLeave, activePolicies, balancesAttention, requestsByType] = await Promise.all([
      db.user.count({ where: { isActive: true } }),
      db.user.groupBy({ by: ["role"], where: { isActive: true }, _count: { _all: true } }),
      db.user.groupBy({ by: ["departmentId"], where: { isActive: true }, _count: { _all: true } }),
      db.leaveRequest.count({ where: { status: "PENDING" } }),
      db.leaveRequest.count({ where: { status: "APPROVED", decidedAt: { gte: monthStart, lt: monthEnd } } }),
      db.leaveRequest.count({ where: { status: "REJECTED", decidedAt: { gte: monthStart, lt: monthEnd } } }),
      db.leaveRequest.count({ where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } } }),
      db.leavePolicy.count({ where: { effectiveFrom: { lte: today }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }] } }),
      db.leaveBalance.count({ where: { usedDays: { gt: db.leaveBalance.fields.entitledDays } } }),
      db.leaveRequest.groupBy({ by: ["leaveTypeId"], _count: { _all: true } }),
    ]);
    const departments = await db.department.findMany({ select: { id: true, name: true } });
    const leaveTypes = await db.leaveType.findMany({ select: { id: true, name: true } });
    return {
      metrics: { activeEmployees, pendingRequests, approvedThisMonth, rejectedThisMonth, currentlyOnLeave, activePolicies, balancesAttention },
      employeesByRole: usersByRole.map((item) => ({ label: item.role, value: item._count._all })),
      employeesByDepartment: usersByDepartment.map((item) => ({ label: departments.find((department) => department.id === item.departmentId)?.name ?? "Unassigned", value: item._count._all })),
      requestsByLeaveType: requestsByType.map((item) => ({ label: leaveTypes.find((type) => type.id === item.leaveTypeId)?.name ?? "Unknown", value: item._count._all })),
    };
  },

  async getEmployees(actor: AuthenticatedUser, filters: EmployeeFilters) {
    requireAdmin(actor);
    const where: Prisma.UserWhereInput = {
      role: filters.role,
      departmentId: filters.departmentId,
      isActive: filters.isActive,
      OR: filters.search ? [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ] : undefined,
    };
    const orderBy = { [filters.sort]: filters.order } as Prisma.UserOrderByWithRelationInput;
    const [total, data] = await db.$transaction([
      db.user.count({ where }),
      db.user.findMany({ where, select: employeeSelect, orderBy, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
    ]);
    return { data, meta: createPaginationMeta(filters, total) };
  },

  async getEmployee(actor: AuthenticatedUser, id: string) {
    requireAdmin(actor);
    const user = await db.user.findUnique({
      where: { id },
      select: {
        ...employeeSelect,
        authProviderId: true,
        leaveBalances: { select: { id: true, year: true, entitledDays: true, carriedDays: true, usedDays: true, leaveType: { select: { id: true, code: true, name: true } } }, orderBy: [{ year: "desc" }, { leaveType: { name: "asc" } }] },
        leaveRequests: { select: { id: true, startDate: true, endDate: true, requestedDays: true, status: true, leaveType: { select: { name: true } } }, orderBy: { submittedAt: "desc" }, take: 5 },
      },
    });
    if (!user) throw new AdminNotFoundError("Employee not found");
    const { authProviderId, ...safeUser } = user;
    const today = new Date();
    const policies = await db.leavePolicy.findMany({ where: { effectiveFrom: { lte: today }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }] }, select: { id: true, name: true, allowanceDays: true, leaveType: { select: { id: true, name: true } } } });
    return { ...safeUser, authenticationLinked: Boolean(authProviderId), currentPolicies: policies };
  },

  async createEmployee(actor: AuthenticatedUser, input: EmployeeInput) {
    requireAdmin(actor);
    if (await db.user.findUnique({ where: { email: input.email }, select: { id: true } })) throw new AdminConflictError("An employee with this email already exists");
    await validateAssignments(input);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(input.email);
    if (error || !data.user) throw new ProvisioningError();
    try {
      return await db.$transaction(async (transaction) => {
        const user = await transaction.user.create({ data: { authProviderId: data.user.id, email: input.email, name: input.name, role: input.role, departmentId: normalizeNullable(input.departmentId), managerId: normalizeNullable(input.managerId), isActive: input.isActive }, select: employeeSelect });
        await initializeUserBalances(user.id, new Date().getUTCFullYear(), transaction);
        return user;
      });
    } catch (caughtError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      if (caughtError instanceof Error) throw caughtError;
      throw new ProvisioningError();
    }
  },

  async updateEmployee(actor: AuthenticatedUser, id: string, input: EmployeeUpdateInput) {
    requireAdmin(actor);
    const existing = await db.user.findUnique({ where: { id }, select: { ...employeeSelect } });
    if (!existing) throw new AdminNotFoundError("Employee not found");
    const departmentId = input.departmentId === undefined ? existing.departmentId : input.departmentId;
    const managerId = input.managerId === undefined ? existing.managerId : input.managerId;
    await validateAssignments({ departmentId, managerId }, id);
    const removesActiveAdmin = existing.role === "ADMIN" && existing.isActive && (input.role && input.role !== "ADMIN" || input.isActive === false);
    if (removesActiveAdmin) {
      const activeAdmins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
      if (activeAdmins <= 1) throw new AdminConflictError("The last active Admin cannot be demoted or deactivated");
    }
    return db.user.update({ where: { id }, data: { ...input, departmentId: normalizeNullable(departmentId), managerId: normalizeNullable(managerId) }, select: employeeSelect });
  },

  async deactivateEmployee(actor: AuthenticatedUser, id: string) {
    return this.updateEmployee(actor, id, { isActive: false });
  },

  async getDepartments(actor: AuthenticatedUser) {
    requireAdmin(actor);
    return db.department.findMany({ select: { id: true, name: true, description: true, isActive: true, createdAt: true, _count: { select: { users: true } } }, orderBy: { name: "asc" } });
  },

  async createDepartment(actor: AuthenticatedUser, input: { name: string; description?: string | null }) {
    requireAdmin(actor);
    if (await db.department.findUnique({ where: { name: input.name }, select: { id: true } })) throw new AdminConflictError("Department name already exists");
    return db.department.create({ data: input });
  },

  async updateDepartment(actor: AuthenticatedUser, id: string, input: { name?: string; description?: string | null; isActive?: boolean }) {
    requireAdmin(actor);
    const department = await db.department.findUnique({ where: { id }, select: { id: true } });
    if (!department) throw new AdminNotFoundError("Department not found");
    if (input.isActive === false && await db.user.count({ where: { departmentId: id, isActive: true } })) throw new AdminConflictError("Move or deactivate active employees before deactivating this department");
    return db.department.update({ where: { id }, data: input });
  },

  async getLeaveTypes(actor: AuthenticatedUser) {
    requireAdmin(actor);
    return db.leaveType.findMany({ select: { id: true, code: true, name: true, description: true, isPaid: true, isActive: true, createdAt: true, _count: { select: { policies: true, balances: true, requests: true } } }, orderBy: { name: "asc" } });
  },

  async createLeaveType(actor: AuthenticatedUser, input: { code: string; name: string; description?: string | null; isPaid: boolean; isActive: boolean }) {
    requireAdmin(actor);
    const duplicate = await db.leaveType.findFirst({ where: { OR: [{ code: input.code }, { name: input.name }] }, select: { id: true } });
    if (duplicate) throw new AdminConflictError("Leave type code or name already exists");
    return db.leaveType.create({ data: input });
  },

  async updateLeaveType(actor: AuthenticatedUser, id: string, input: { name?: string; description?: string | null; isPaid?: boolean; isActive?: boolean }) {
    requireAdmin(actor);
    const type = await db.leaveType.findUnique({ where: { id }, select: { id: true, isPaid: true, _count: { select: { requests: true } } } });
    if (!type) throw new AdminNotFoundError("Leave type not found");
    if (input.isPaid !== undefined && input.isPaid !== type.isPaid && type._count.requests > 0) throw new AdminConflictError("Paid status cannot change after requests reference this leave type");
    return db.leaveType.update({ where: { id }, data: input });
  },

  async getPolicies(actor: AuthenticatedUser, filters: PaginationInput & { leaveTypeId?: string; period: "current" | "upcoming" | "all" }) {
    requireAdmin(actor);
    const today = new Date();
    const where: Prisma.LeavePolicyWhereInput = { leaveTypeId: filters.leaveTypeId, ...(filters.period === "current" ? { effectiveFrom: { lte: today }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }] } : filters.period === "upcoming" ? { effectiveFrom: { gt: today } } : {}) };
    const [total, data, affectedEmployees] = await Promise.all([
      db.leavePolicy.count({ where }),
      db.leavePolicy.findMany({ where, select: { id: true, name: true, allowanceDays: true, maximumCarryOver: true, allowNegative: true, effectiveFrom: true, effectiveTo: true, createdAt: true, updatedAt: true, leaveType: { select: { id: true, code: true, name: true, isPaid: true, isActive: true } } }, orderBy: { effectiveFrom: "desc" }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
      db.user.count({ where: { isActive: true } }),
    ]);
    return { data: data.map((policy) => ({ ...policy, affectedEmployees, status: policy.effectiveFrom > today ? "UPCOMING" : policy.effectiveTo && policy.effectiveTo < today ? "HISTORICAL" : "CURRENT" })), meta: createPaginationMeta(filters, total) };
  },

  async createPolicy(actor: AuthenticatedUser, input: PolicyInput) {
    requireAdmin(actor);
    const type = await db.leaveType.findFirst({ where: { id: input.leaveTypeId, isActive: true }, select: { id: true } });
    if (!type) throw new AdminValidationError("Leave type is invalid or inactive");
    await ensurePolicyDoesNotOverlap(input);
    return db.leavePolicy.create({ data: input });
  },

  async updatePolicy(actor: AuthenticatedUser, id: string, input: Partial<Omit<PolicyInput, "leaveTypeId">>) {
    requireAdmin(actor);
    const existing = await db.leavePolicy.findUnique({ where: { id } });
    if (!existing) throw new AdminNotFoundError("Policy not found");
    const today = new Date();
    if (existing.effectiveFrom <= today) throw new AdminConflictError("Current or historical policies cannot be rewritten; create a new policy period");
    const merged = { ...existing, ...input };
    if (merged.effectiveTo && merged.effectiveFrom > merged.effectiveTo) throw new AdminValidationError("End date must not be before start date");
    await ensurePolicyDoesNotOverlap({ leaveTypeId: existing.leaveTypeId, effectiveFrom: merged.effectiveFrom, effectiveTo: merged.effectiveTo }, id);
    return db.leavePolicy.update({ where: { id }, data: input });
  },

  async getBalances(actor: AuthenticatedUser, filters: PaginationInput & { search?: string; departmentId?: string; leaveTypeId?: string; year?: number }) {
    requireAdmin(actor);
    const where: Prisma.LeaveBalanceWhereInput = { year: filters.year, leaveTypeId: filters.leaveTypeId, user: { departmentId: filters.departmentId, OR: filters.search ? [{ name: { contains: filters.search, mode: "insensitive" } }, { email: { contains: filters.search, mode: "insensitive" } }] : undefined } };
    const [total, balances] = await db.$transaction([
      db.leaveBalance.count({ where }),
      db.leaveBalance.findMany({ where, select: { id: true, year: true, entitledDays: true, carriedDays: true, usedDays: true, updatedAt: true, user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } }, leaveType: { select: { id: true, code: true, name: true } } }, orderBy: [{ year: "desc" }, { user: { name: "asc" } }], skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
    ]);
    return { data: balances.map((balance) => ({ ...balance, remainingDays: balance.entitledDays.plus(balance.carriedDays).minus(balance.usedDays), requiresAttention: balance.entitledDays.plus(balance.carriedDays).minus(balance.usedDays).isNegative() })), meta: createPaginationMeta(filters, total) };
  },

  async initializeBalances(actor: AuthenticatedUser, year: number, preview: boolean) {
    requireAdmin(actor);
    const users = await db.user.findMany({ where: { isActive: true }, select: { id: true } });
    const effectiveDate = new Date(Date.UTC(year, 0, 1));
    const policies = await db.leavePolicy.findMany({ where: { effectiveFrom: { lte: effectiveDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }], leaveType: { isActive: true } }, select: { leaveTypeId: true, allowanceDays: true }, orderBy: { effectiveFrom: "desc" } });
    const uniquePolicies = Array.from(new Map(policies.map((policy) => [policy.leaveTypeId, policy])).values());
    const candidates = users.flatMap((user) => uniquePolicies.map((policy) => ({ userId: user.id, leaveTypeId: policy.leaveTypeId, year, entitledDays: policy.allowanceDays, carriedDays: new Prisma.Decimal(0), usedDays: new Prisma.Decimal(0) })));
    const existing = await db.leaveBalance.findMany({ where: { year, OR: candidates.map(({ userId, leaveTypeId }) => ({ userId, leaveTypeId })) }, select: { userId: true, leaveTypeId: true } });
    const existingKeys = new Set(existing.map((item) => `${item.userId}:${item.leaveTypeId}`));
    const missing = candidates.filter((item) => !existingKeys.has(`${item.userId}:${item.leaveTypeId}`));
    if (!preview && missing.length) await db.leaveBalance.createMany({ data: missing, skipDuplicates: true });
    return { year, activeEmployees: users.length, policiesApplied: uniquePolicies.length, toCreate: missing.length, unchanged: candidates.length - missing.length, created: preview ? 0 : missing.length, preview };
  },
};
