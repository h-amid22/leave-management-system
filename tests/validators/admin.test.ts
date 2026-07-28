import { describe, expect, it } from "vitest";
import { createEmployeeSchema, policyCreateSchema } from "@/validators/admin";

describe("Admin payload validation", () => {
  it("rejects roles outside the application enum", () => { expect(createEmployeeSchema.safeParse({ email: "user@example.com", name: "User Name", role: "OWNER", isActive: true }).success).toBe(false); });
  it("rejects a policy whose end precedes its start", () => { expect(policyCreateSchema.safeParse({ name: "Policy", leaveTypeId: "44444444-4444-4444-8444-444444444444", allowanceDays: 10, maximumCarryOver: 0, allowNegative: false, effectiveFrom: "2099-12-31", effectiveTo: "2099-01-01" }).success).toBe(false); });
  it("rejects negative policy allowance", () => { expect(policyCreateSchema.safeParse({ name: "Policy", leaveTypeId: "44444444-4444-4444-8444-444444444444", allowanceDays: -1, maximumCarryOver: 0, allowNegative: false, effectiveFrom: "2099-01-01" }).success).toBe(false); });
});
