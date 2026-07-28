import "server-only";

const counters = new Map<string, number>();
let totalDurationMs = 0;
let timedRequests = 0;

export function incrementMetric(name: string, amount = 1) {
  counters.set(name, (counters.get(name) ?? 0) + amount);
}

export function observeRequest(durationMs: number, failed = false) {
  incrementMetric("requests_total");
  if (failed) incrementMetric("requests_failed_total");
  totalDurationMs += durationMs;
  timedRequests += 1;
}

export function getMetricsSnapshot() {
  return {
    counters: Object.fromEntries(counters),
    averageResponseTimeMs: timedRequests ? totalDurationMs / timedRequests : 0,
  };
}

export function resetMetricsForTests() {
  if (process.env.NODE_ENV === "test") {
    counters.clear(); totalDurationMs = 0; timedRequests = 0;
  }
}
