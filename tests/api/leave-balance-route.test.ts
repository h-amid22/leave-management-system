import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationError } from "@/lib/auth/errors";
import { createActor } from "@/tests/support/actors";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  getBalancesForUser: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/services/leave-balance-service", () => ({
  leaveBalanceService: { getBalancesForUser: mocks.getBalancesForUser },
}));

import { GET } from "@/app/api/leave-balances/route";

beforeEach(() => {
  mocks.requireCurrentUser.mockResolvedValue(createActor());
  mocks.getBalancesForUser.mockResolvedValue([]);
});

describe("own leave balance endpoint", () => {
  it("returns 401 without a session", async () => {
    mocks.requireCurrentUser.mockRejectedValue(new AuthenticationError());

    const response = await GET(
      new Request("http://localhost/api/leave-balances"),
    );

    expect(response.status).toBe(401);
  });

  it("never accepts a client-selected employee ID", async () => {
    const actor = createActor();
    mocks.requireCurrentUser.mockResolvedValue(actor);

    const response = await GET(
      new Request(
        "http://localhost/api/leave-balances?userId=55555555-5555-4555-8555-555555555555",
      ),
    );

    expect(response.status).toBe(400);
    expect(mocks.getBalancesForUser).not.toHaveBeenCalled();
  });
});
