import { describe, expect, it } from "vitest";

import { calculateInclusiveDays } from "@/lib/leave/dates";

describe("leave duration calculation", () => {
  it("counts both the start and end date", () => {
    expect(calculateInclusiveDays("2026-08-10", "2026-08-12")).toBe(3);
  });

  it("returns one for a single-day request", () => {
    expect(calculateInclusiveDays("2026-08-10", "2026-08-10")).toBe(1);
  });

  it("rejects reversed or malformed ranges", () => {
    expect(calculateInclusiveDays("2026-08-12", "2026-08-10")).toBe(0);
    expect(calculateInclusiveDays("not-a-date", "2026-08-10")).toBe(0);
  });
});
