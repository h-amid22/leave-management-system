import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { AdminConflictError, AdminValidationError } from "@/services/admin-domain-errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(), userFindFirst: vi.fn(), userCount: vi.fn(), userUpdate: vi.fn(), userFindMany: vi.fn(),
  departmentFindFirst: vi.fn(), policyFindFirst: vi.fn(), policyFindMany: vi.fn(), leaveTypeFindFirst: vi.fn(),
  balanceFindMany: vi.fn(), balanceCreateMany: vi.fn(), transaction: vi.fn(), invite: vi.fn(), deleteAuth: vi.fn(), userCreate: vi.fn(),
}));
const transactionClient = { user: { create: mocks.userCreate }, leavePolicy: { findMany: mocks.policyFindMany }, leaveBalance: { createMany: mocks.balanceCreateMany } };
vi.mock("@/db", () => ({ db: { user: { findUnique: mocks.userFindUnique, findFirst: mocks.userFindFirst, count: mocks.userCount, update: mocks.userUpdate, findMany: mocks.userFindMany }, department: { findFirst: mocks.departmentFindFirst }, leavePolicy: { findFirst: mocks.policyFindFirst, findMany: mocks.policyFindMany }, leaveType: { findFirst: mocks.leaveTypeFindFirst }, leaveBalance: { findMany: mocks.balanceFindMany, createMany: mocks.balanceCreateMany }, $transaction: mocks.transaction } }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ auth: { admin: { inviteUserByEmail: mocks.invite, deleteUser: mocks.deleteAuth } } }) }));
import { adminService } from "@/services/admin-service";

const admin = createActor({ role: "ADMIN" });
beforeEach(() => {
  mocks.userFindUnique.mockResolvedValue(null); mocks.departmentFindFirst.mockResolvedValue({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }); mocks.userFindFirst.mockResolvedValue({ id: "manager", departmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", managerId: null }); mocks.userCount.mockResolvedValue(2); mocks.policyFindFirst.mockResolvedValue(null); mocks.leaveTypeFindFirst.mockResolvedValue({ id: "type" }); mocks.invite.mockResolvedValue({ data: { user: { id: "auth-user" } }, error: null }); mocks.userCreate.mockResolvedValue({ id: "new-user", email: "new@example.com", name: "New User" }); mocks.policyFindMany.mockResolvedValue([]); mocks.balanceCreateMany.mockResolvedValue({ count: 0 }); mocks.transaction.mockImplementation(async (callback: (client: typeof transactionClient) => Promise<unknown>) => callback(transactionClient)); mocks.userFindMany.mockResolvedValue([{ id: "user-1" }]); mocks.balanceFindMany.mockResolvedValue([]);
});

describe("Admin employee rules", () => {
  it("provisions Auth before creating a valid application employee", async () => { await adminService.createEmployee(admin, { email: "new@example.com", name: "New User", role: "EMPLOYEE", departmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", isActive: true }); expect(mocks.invite).toHaveBeenCalledWith("new@example.com"); expect(mocks.userCreate).toHaveBeenCalledOnce(); });
  it("rejects a duplicate email before provisioning", async () => { mocks.userFindUnique.mockResolvedValue({ id: "existing" }); await expect(adminService.createEmployee(admin, { email: "new@example.com", name: "New User", role: "EMPLOYEE", isActive: true })).rejects.toBeInstanceOf(AdminConflictError); expect(mocks.invite).not.toHaveBeenCalled(); });
  it("rejects an invalid department", async () => { mocks.departmentFindFirst.mockResolvedValue(null); await expect(adminService.createEmployee(admin, { email: "new@example.com", name: "New User", role: "EMPLOYEE", departmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", isActive: true })).rejects.toBeInstanceOf(AdminValidationError); });
  it("rejects self-manager assignment", async () => { mocks.userFindUnique.mockResolvedValue({ id: "user", name: "User", role: "EMPLOYEE", isActive: true, departmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", managerId: null }); await expect(adminService.updateEmployee(admin, "user", { managerId: "user" })).rejects.toBeInstanceOf(AdminValidationError); });
  it("protects the final active Admin", async () => { mocks.userFindUnique.mockResolvedValue({ id: "admin", name: "Admin", role: "ADMIN", isActive: true, departmentId: null, managerId: null }); mocks.userCount.mockResolvedValue(1); await expect(adminService.updateEmployee(admin, "admin", { role: "EMPLOYEE" })).rejects.toBeInstanceOf(AdminConflictError); });
});

describe("Admin policy and balance rules", () => {
  it("rejects overlapping policy periods", async () => { mocks.policyFindFirst.mockResolvedValue({ id: "existing" }); await expect(adminService.createPolicy(admin, { name: "Policy", leaveTypeId: "44444444-4444-4444-8444-444444444444", allowanceDays: 10, maximumCarryOver: 0, allowNegative: false, effectiveFrom: new Date("2099-01-01"), effectiveTo: new Date("2099-12-31") })).rejects.toBeInstanceOf(AdminConflictError); });
  it("initialization creates only missing balances and preserves existing rows", async () => { mocks.policyFindMany.mockResolvedValue([{ leaveTypeId: "type-a", allowanceDays: new Prisma.Decimal(20) }, { leaveTypeId: "type-b", allowanceDays: new Prisma.Decimal(10) }]); mocks.balanceFindMany.mockResolvedValue([{ userId: "user-1", leaveTypeId: "type-a" }]); const result = await adminService.initializeBalances(admin, 2099, false); expect(result).toMatchObject({ toCreate: 1, unchanged: 1, created: 1 }); expect(mocks.balanceCreateMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true })); });
});
