import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationError } from "@/lib/auth/errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findActiveByAuthProviderId: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
  }),
}));

vi.mock("@/services/user-service", () => ({
  userService: {
    findActiveByAuthProviderId: mocks.findActiveByAuthProviderId,
  },
}));

import { getCurrentUser, requireCurrentUser } from "@/lib/auth/current-user";

beforeEach(() => {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "supabase-user-id" } },
    error: null,
  });
  mocks.findActiveByAuthProviderId.mockResolvedValue(createActor());
});

describe("current application user resolution", () => {
  it("maps the verified Supabase user ID to the active application user", async () => {
    await expect(getCurrentUser()).resolves.toMatchObject({
      id: createActor().id,
      role: "EMPLOYEE",
    });
    expect(mocks.findActiveByAuthProviderId).toHaveBeenCalledWith(
      "supabase-user-id",
    );
  });

  it("does not query application users without a verified session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.findActiveByAuthProviderId).not.toHaveBeenCalled();
  });

  it("rejects a Supabase user without an active application-user mapping", async () => {
    mocks.findActiveByAuthProviderId.mockResolvedValue(null);

    await expect(requireCurrentUser()).rejects.toBeInstanceOf(AuthenticationError);
  });
});
