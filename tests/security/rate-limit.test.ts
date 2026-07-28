import { beforeEach, describe, expect, it } from "vitest";

import {
  enforceRateLimit,
  RateLimitError,
  resetRateLimitsForTests,
} from "@/lib/security/rate-limit";

describe("rate limiting", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("limits repeated requests in the same scope and client window", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const options = { scope: "test", limit: 2, windowMs: 60_000 };

    enforceRateLimit(request, options);
    enforceRateLimit(request, options);

    expect(() => enforceRateLimit(request, options)).toThrow(RateLimitError);
  });

  it("isolates clients and endpoint scopes", () => {
    const first = new Request("http://localhost", {
      headers: { "x-real-ip": "203.0.113.1" },
    });
    const second = new Request("http://localhost", {
      headers: { "x-real-ip": "203.0.113.2" },
    });

    enforceRateLimit(first, { scope: "login", limit: 1, windowMs: 60_000 });

    expect(() => enforceRateLimit(second, { scope: "login", limit: 1, windowMs: 60_000 })).not.toThrow();
    expect(() => enforceRateLimit(first, { scope: "search", limit: 1, windowMs: 60_000 })).not.toThrow();
  });
});
