import { describe, expect, it } from "vitest";

import { calculateIvaDetermination } from "@/modules/declarations/domain/iva";

describe("calculateIvaDetermination", () => {
  it("aplica crédito y retenciones actuales junto a los saldos anteriores", () => {
    expect(calculateIvaDetermination({
      sales: [{ taxableBase: 1000, exemptAmount: 0, taxAmount: 160 }],
      purchases: [{ taxAmount: 50 }],
      retentions: [{ amount: 20 }],
      previousFiscalCredit: 10,
      previousRetentionCredit: 5,
    })).toMatchObject({
      deductibleTaxCredit: 50,
      fiscalCreditsAvailable: 60,
      taxBeforeRetentions: 100,
      retentionCreditsAvailable: 25,
      taxPayable: 75,
      fiscalCreditCarryforward: 0,
      retentionCreditCarryforward: 0,
    });
  });

  it("conserva por separado los remanentes fiscal y de retenciones", () => {
    expect(calculateIvaDetermination({
      sales: [{ taxableBase: 100, exemptAmount: 0, taxAmount: 16 }],
      purchases: [{ taxAmount: 30 }],
      retentions: [{ amount: 8 }],
      previousFiscalCredit: 6,
      previousRetentionCredit: 4,
    })).toMatchObject({
      taxPayable: 0,
      fiscalCreditCarryforward: 20,
      retentionCreditCarryforward: 12,
    });
  });

  it("prorratea solo cuando coexisten ventas gravadas y exentas", () => {
    const result = calculateIvaDetermination({
      sales: [{ taxableBase: 600, exemptAmount: 400, taxAmount: 96 }],
      purchases: [{ taxAmount: 100 }],
      retentions: [],
      previousFiscalCredit: 0,
      previousRetentionCredit: 0,
    });
    expect(result.prorationFactor).toBe(0.6);
    expect(result.deductibleTaxCredit).toBe(60);
    expect(result.taxPayable).toBe(36);
  });
});
