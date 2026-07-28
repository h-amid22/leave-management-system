import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/auth/errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { user: { findFirst: mocks.findFirst } },
}));

import { userService } from "@/services/user-service";

const targetId = "55555555-5555-4555-8555-555555555555";
const managerId = "22222222-2222-4222-8222-222222222222";
const departmentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function target(overrides: Record<string, unknown> = {}) {
  return {
    id: targetId,
    email: "target@leave.example",
    name: "Target Employee",
    role: "EMPLOYEE",
    departmentId,
    managerId,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.findFirst.mockResolvedValue(target());
});

describe("centralized employee scope", () => {
  it("prevents an employee from viewing another employee", async () => {
    await expect(
      userService.requireAccessibleUser(createActor(), targetId),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("allows a manager's direct report in the same department", async () => {
    const manager = createActor({
      id: managerId,
      role: "MANAGER",
      departmentId,
    });

    await expect(
      userService.requireAccessibleUser(manager, targetId),
    ).resolves.toMatchObject({ id: targetId });
  });

  it("rejects a manager outside direct-report scope", async () => {
    const manager = createActor({
      id: "66666666-6666-4666-8666-666666666666",
      role: "MANAGER",
      departmentId,
    });

    await expect(
      userService.requireAccessibleUser(manager, targetId),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("rejects a direct report in another department", async () => {
    mocks.findFirst.mockResolvedValue(
      target({ departmentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
    );
    const manager = createActor({ id: managerId, role: "MANAGER", departmentId });

    await expect(
      userService.requireAccessibleUser(manager, targetId),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it.each(["HR", "ADMIN"] as const)(
    "allows %s organization-wide access",
    async (role) => {
      await expect(
        userService.requireAccessibleUser(createActor({ role }), targetId),
      ).resolves.toMatchObject({ id: targetId });
    },
  );
});
