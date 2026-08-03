import { describe, expect, it } from "vitest";

import { accountInputSchema, serializeAccount, toDatabaseAccount } from "@/modules/chart-of-accounts/domain/chart-of-accounts";

describe("chart of accounts domain", () => {
  it("maps a manual account to persisted enum values", () => {
    const input = accountInputSchema.parse({
      code: " 7.01 ", name: " Cuenta de control ", type: "Orden", nature: "Acreedora", level: "2",
      parent: "", use: "Control interno", acceptsMovements: false, status: "Activa",
    });
    expect(toDatabaseAccount(input)).toEqual({
      code: "7.01", name: "Cuenta de control", type: "MEMORANDUM", nature: "CREDIT", level: 2,
      parent: "Sin cuenta superior", use: "Control interno", acceptsMovements: false, status: "ACTIVE",
    });
  });

  it("serializes database accounts for the existing Spanish UI", () => {
    expect(serializeAccount({
      id: "019fc000-0000-7000-8000-000000000001", version: 3, code: "5.01", name: "Costo de ventas",
      type: "COST", nature: "DEBIT", level: 2, parent: "5 · COSTOS", use: "Costo operativo",
      acceptsMovements: true, status: "INACTIVE", sourceTemplateAccountId: "019fc000-0000-7000-8000-000000000002",
    })).toMatchObject({ type: "Costo", nature: "Deudora", level: "2", status: "Inactiva", source: "Plan base" });
  });

  it("rejects levels outside the five-level structure", () => {
    const result = accountInputSchema.safeParse({
      code: "8", name: "Inválida", type: "Activo", nature: "Deudora", level: 6,
      parent: "Sin cuenta superior", use: "", acceptsMovements: true, status: "Activa",
    });
    expect(result.success).toBe(false);
  });
});
