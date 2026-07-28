import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/audit-service", () => ({ auditService: { record: vi.fn() } }));
import { AuthorizationError } from "@/lib/auth/errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({ requireAdminUser: vi.fn(), getSummary: vi.fn() }));
vi.mock("@/lib/auth/admin", () => ({ requireAdminUser: mocks.requireAdminUser }));
vi.mock("@/services/admin-service", () => ({ adminService: { getSummary: mocks.getSummary } }));
import { GET } from "@/app/api/admin/summary/route";

beforeEach(() => { mocks.requireAdminUser.mockResolvedValue(createActor({ role: "ADMIN" })); mocks.getSummary.mockResolvedValue({ metrics: {} }); });
describe("Admin API boundary", () => {
  it("returns authorized Admin data with private no-store caching", async () => { const response = await GET(); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store"); });
  it("returns 403 without invoking services for a non-Admin", async () => { mocks.requireAdminUser.mockRejectedValue(new AuthorizationError()); const response = await GET(); expect(response.status).toBe(403); expect(mocks.getSummary).not.toHaveBeenCalled(); });
});
