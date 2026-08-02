import { describe, expect, it } from "vitest";

import { addDeadlineDays, formatDeadlineRule } from "@/lib/deadline-rules";

describe("deadline rules", () => {
  it("counts the first day of the period when the base is period-start", () => {
    expect(
      addDeadlineDays(new Date("2026-06-01T00:00:00.000Z"), 15, "business", true)
        .toISOString()
        .slice(0, 10),
    ).toBe("2026-06-19");
    expect(
      addDeadlineDays(new Date("2026-06-01T00:00:00.000Z"), 5, "calendar", true)
        .toISOString()
        .slice(0, 10),
    ).toBe("2026-06-05");
  });

  it("keeps counting after the base for period-end rules", () => {
    expect(
      addDeadlineDays(new Date("2026-06-30T00:00:00.000Z"), 5, "calendar")
        .toISOString()
        .slice(0, 10),
    ).toBe("2026-07-05");
  });

  it("describes the base as the start of the current period", () => {
    expect(
      formatDeadlineRule({
        mode: "days",
        dayCount: 15,
        dayType: "business",
        base: "period-start",
      }),
    ).toBe("Primeros 15 días hábiles desde el inicio del período");
  });
});
