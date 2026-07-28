import { beforeEach, describe, expect, it, vi } from "vitest";
import { configureMonitoring, captureException } from "@/lib/observability/monitoring";
import { getMetricsSnapshot, incrementMetric, observeRequest, resetMetricsForTests } from "@/lib/observability/metrics";
import { getRequestContext } from "@/lib/observability/request-context";

beforeEach(() => resetMetricsForTests());
describe("observability foundations", () => {
  it("preserves or creates request correlation IDs", () => {
    expect(getRequestContext(new Request("http://localhost", { headers: { "x-request-id": "req-1" } })).requestId).toBe("req-1");
    expect(getRequestContext().requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
  it("collects exportable counters and average timing", () => {
    incrementMetric("approvals_total"); observeRequest(10); observeRequest(30, true);
    expect(getMetricsSnapshot()).toEqual({ counters: { approvals_total: 1, requests_total: 2, requests_failed_total: 1 }, averageResponseTimeMs: 20 });
  });
  it("delegates exceptions through a vendor-neutral provider", async () => {
    const capture = vi.fn(); configureMonitoring({ captureException: capture, captureMessage: vi.fn() });
    const error = new Error("failure"); await captureException(error, { requestId: "req-1" });
    expect(capture).toHaveBeenCalledWith(error, { requestId: "req-1" });
  });
});
