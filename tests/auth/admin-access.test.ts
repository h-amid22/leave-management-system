import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/auth/errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
import { requireAdminUser } from "@/lib/auth/admin";

beforeEach(() => { mocks.requireCurrentUser.mockResolvedValue(createActor({ role: "ADMIN" })); });
describe("Admin workspace authorization", () => {
  it("allows an Admin", async () => { await expect(requireAdminUser()).resolves.toMatchObject({ role: "ADMIN" }); });
  it.each(["EMPLOYEE", "MANAGER", "HR"] as const)("rejects %s", async (role) => { mocks.requireCurrentUser.mockResolvedValue(createActor({ role })); await expect(requireAdminUser()).rejects.toBeInstanceOf(AuthorizationError); });
});
