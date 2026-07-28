import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ count: vi.fn() }));
vi.mock("@/db", () => ({ db: { user: { count: mocks.count } } }));
vi.mock("@/lib/env", () => ({ getDatabaseEnv: () => ({ DATABASE_URL: "postgresql://safe" }), getSupabaseEnv: () => ({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public" }) }));
import { GET } from "@/app/api/ready/route";

beforeEach(() => { mocks.count.mockReset(); mocks.count.mockResolvedValue(1); });
describe("readiness route", () => {
  it("reports sanitized dependency status and correlation ID", async () => {
    const response = await GET(new Request("http://localhost/api/ready", { headers: { "x-request-id": "req-ready" } }));
    expect(response.status).toBe(200); expect(response.headers.get("x-request-id")).toBe("req-ready");
    await expect(response.json()).resolves.toMatchObject({ status: "ready", requestId: "req-ready", checks: { database: "ok", environment: "ok" } });
  });
  it("returns 503 without exposing failure details", async () => {
    mocks.count.mockRejectedValueOnce(new Error("postgresql://secret"));
    const response = await GET(new Request("http://localhost/api/ready"));
    expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
