import { describe, expect, it } from "vitest";

import { summarizeAnnualMonth } from "@/modules/calendar/domain/annual-status";

const today = new Date("2026-08-02T00:00:00.000Z");

describe("annual compliance status", () => {
  it("shows an unstarted later period as future", () => {
    expect(
      summarizeAnnualMonth(
        [{ status: "PENDING" }],
        new Date("2026-09-01T00:00:00.000Z"),
        today,
      ),
    ).toBe("FUTURE");
  });

  it("uses the least complete state when a month has two cases", () => {
    expect(
      summarizeAnnualMonth(
        [{ status: "PAID" }, { status: "PENDING" }],
        new Date("2026-07-01T00:00:00.000Z"),
        today,
      ),
    ).toBe("PENDING");
    expect(
      summarizeAnnualMonth(
        [{ status: "PAID" }, { status: "SUBMITTED" }],
        new Date("2026-07-01T00:00:00.000Z"),
        today,
      ),
    ).toBe("REGISTERED");
  });

  it("keeps months without an applicable case out of the totals", () => {
    expect(
      summarizeAnnualMonth([], new Date("2026-01-01T00:00:00.000Z"), today),
    ).toBe("NOT_APPLICABLE");
    expect(
      summarizeAnnualMonth(
        [{ status: "PAID" }, { status: "CLOSED" }],
        new Date("2026-01-01T00:00:00.000Z"),
        today,
      ),
    ).toBe("COMPLETED");
  });
});
