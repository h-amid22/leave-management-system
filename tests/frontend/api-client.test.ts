// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authenticated API client", () => {
  it("disables fetch caching for personal responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "user-id" } }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/api/auth/me");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );
  });

  it("converts a non-JSON server failure into a safe API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>failure</html>", {
          status: 500,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );

    await expect(apiRequest("/api/leave-requests")).rejects.toEqual(
      expect.objectContaining({
        message: "The request could not be completed.",
        status: 500,
      }),
    );
  });

  it("supports a successful empty response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(apiRequest<void>("/api/example")).resolves.toBeUndefined();
  });
});
