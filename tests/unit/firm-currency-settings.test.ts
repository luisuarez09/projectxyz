import { describe, expect, it } from "vitest";

import { firmGeneralSettingsSchema } from "@/modules/firm/application/general-settings";

const base = {
  version: 1,
  entityType: "NATURAL_PERSON" as const,
  legalName: "Firma de prueba",
  tradeName: "",
  rif: "V-12345678-9",
  fiscalAddress: "",
  email: "",
  phone: "",
  pdfHeader: "",
  pdfFooter: "",
  archivePaperSize: "LETTER" as const,
  exchangeRateSyncStart: "18:00",
  exchangeRateSyncEnd: "21:00",
  exchangeRateSyncInterval: 30 as const,
};

describe("firm currency settings", () => {
  it("accepts the default BCV schedule and a supported currency", () => {
    const result = firmGeneralSettingsSchema.parse({
      ...base,
      currencies: [{ code: "usd", name: "Dólar", symbol: "$", source: "BCV", sourceName: "", sourceUrl: "", automaticEnabled: true, active: true }],
    });
    expect(result.currencies[0].code).toBe("USD");
    expect(result.exchangeRateSyncInterval).toBe(30);
  });

  it("rejects unsupported BCV codes and incomplete external sources", () => {
    expect(() => firmGeneralSettingsSchema.parse({
      ...base,
      currencies: [{ code: "COP", name: "Peso colombiano", symbol: "$", source: "BCV", sourceName: "", sourceUrl: "", automaticEnabled: true, active: true }],
    })).toThrow();
    expect(() => firmGeneralSettingsSchema.parse({
      ...base,
      currencies: [{ code: "COP", name: "Peso colombiano", symbol: "$", source: "EXTERNAL", sourceName: "Proveedor", sourceUrl: "", automaticEnabled: false, active: true }],
    })).toThrow();
  });
});
