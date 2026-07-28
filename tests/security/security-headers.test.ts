import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";

describe("production security headers", () => {
  it("sets browser hardening headers on every route", async () => {
    const entries = await nextConfig.headers?.();
    const headers = new Map(entries?.[0]?.headers.map(({ key, value }) => [key, value]));

    expect(headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(headers.get("Content-Security-Policy")).not.toContain("default-src *");
  });
});
