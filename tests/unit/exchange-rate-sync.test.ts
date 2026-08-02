import { describe, expect, it } from "vitest";

import { getAutomaticExchangeRateSlot } from "@/worker/exchange-rate-sync";

describe("getAutomaticExchangeRateSlot", () => {
  it("creates thirty-minute retry slots after 18:00 in Caracas", () => {
    expect(getAutomaticExchangeRateSlot(new Date("2026-08-03T22:37:00.000Z"))?.key).toBe("2026-08-03T18:30-04:00");
  });

  it("does not schedule weekend or late-night attempts", () => {
    expect(getAutomaticExchangeRateSlot(new Date("2026-08-02T20:30:00.000Z"))).toBeNull();
    expect(getAutomaticExchangeRateSlot(new Date("2026-08-04T01:31:00.000Z"))).toBeNull();
  });

  it("respects a firm-specific schedule", () => {
    expect(getAutomaticExchangeRateSlot(new Date("2026-08-03T23:20:00.000Z"), { start: "19:00", end: "22:00", intervalMinutes: 60 })?.key).toBe("2026-08-03T19:00-04:00");
  });
});
