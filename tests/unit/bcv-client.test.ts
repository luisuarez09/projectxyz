import { describe, expect, it } from "vitest";

import { BcvResponseError, parseBcvHomepage } from "@/infrastructure/exchange-rates/bcv-client";

const sample = `
  <div id="dolar"><strong class="strong-tb">748,78640000</strong></div>
  <div id="euro"><strong class="strong-tb"> 861,18672650 </strong></div>
  Fecha Valor: <span content="2026-08-03T00:00:00-04:00">Lunes</span>
`;

describe("parseBcvHomepage", () => {
  it("extracts the official effective date and both decimal rates", () => {
    const result = parseBcvHomepage(sample);
    expect(result.effectiveDate).toBe("2026-08-03");
    expect(result.rates).toEqual([
      { currency: "USD", rate: "748.78640000" },
      { currency: "EUR", rate: "861.18672650" },
    ]);
    expect(result.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects an incomplete page instead of persisting partial data", () => {
    expect(() => parseBcvHomepage(sample.replace("861,18672650", "pendiente"))).toThrow(BcvResponseError);
  });
});
