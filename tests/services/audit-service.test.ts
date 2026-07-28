import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/lib/auth/errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({ create: vi.fn(), count: vi.fn(), findMany: vi.fn(), transaction: vi.fn() }));
vi.mock("@/db", () => ({ db: { auditEvent: { create: mocks.create, count: mocks.count, findMany: mocks.findMany }, $transaction: mocks.transaction } }));
import { auditService } from "@/services/audit-service";

beforeEach(() => {
  mocks.create.mockResolvedValue({ id: "event" }); mocks.count.mockResolvedValue(0); mocks.findMany.mockResolvedValue([]);
  mocks.transaction.mockImplementation(async (values: Promise<unknown>[]) => Promise.all(values));
});

describe("audit service", () => {
  it("creates an append-only snapshot without sensitive request data", async () => {
    const actor = createActor({ role: "ADMIN" });
    await auditService.record({ actor, action: "EMPLOYEE_UPDATED", targetEntityType: "User", targetEntityId: "target", metadata: { role: "MANAGER" }, context: { requestId: "request-1", ipAddress: null, userAgent: null } });
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorUserId: actor.id, actorName: actor.name, action: "EMPLOYEE_UPDATED", requestId: "request-1" }) });
  });

  it("allows only Admin users to query audit events", async () => {
    await expect(auditService.list(createActor(), { page: 1, pageSize: 20, order: "desc" })).rejects.toBeInstanceOf(AuthorizationError);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
