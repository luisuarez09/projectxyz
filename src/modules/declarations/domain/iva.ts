export type IvaDeterminationInput = {
  sales: Array<{ taxableBase: number; exemptAmount: number; taxAmount: number }>;
  purchases: Array<{ taxAmount: number }>;
  retentions: Array<{ amount: number }>;
  previousFiscalCredit: number;
  previousRetentionCredit: number;
};

export type IvaDetermination = {
  taxableBase: number;
  exemptAmount: number;
  debitTax: number;
  purchaseTaxCredit: number;
  deductibleTaxCredit: number;
  currentRetentionCredit: number;
  prorationFactor: number | null;
  taxPayable: number;
  fiscalCreditCarryforward: number;
  retentionCreditCarryforward: number;
  fiscalCreditsAvailable: number;
  taxBeforeRetentions: number;
  retentionCreditsAvailable: number;
};

function rounded(value: number) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function calculateIvaDetermination(input: IvaDeterminationInput): IvaDetermination {
  const taxableBase = rounded(input.sales.reduce((sum, item) => sum + item.taxableBase, 0));
  const exemptAmount = rounded(input.sales.reduce((sum, item) => sum + item.exemptAmount, 0));
  const debitTax = rounded(input.sales.reduce((sum, item) => sum + item.taxAmount, 0));
  const purchaseTaxCredit = rounded(input.purchases.reduce((sum, item) => sum + item.taxAmount, 0));
  const totalRelevantSales = taxableBase + exemptAmount;
  const prorationFactor = taxableBase > 0 && exemptAmount > 0 && totalRelevantSales > 0
    ? rounded(taxableBase / totalRelevantSales)
    : null;
  const deductibleTaxCredit = rounded(prorationFactor === null ? purchaseTaxCredit : purchaseTaxCredit * prorationFactor);
  const fiscalCreditsAvailable = rounded(input.previousFiscalCredit + deductibleTaxCredit);
  const taxBeforeRetentions = rounded(Math.max(0, debitTax - fiscalCreditsAvailable));
  const fiscalCreditCarryforward = rounded(Math.max(0, fiscalCreditsAvailable - debitTax));
  const currentRetentionCredit = rounded(input.retentions.reduce((sum, item) => sum + item.amount, 0));
  const retentionCreditsAvailable = rounded(input.previousRetentionCredit + currentRetentionCredit);
  const taxPayable = rounded(Math.max(0, taxBeforeRetentions - retentionCreditsAvailable));
  const retentionCreditCarryforward = rounded(Math.max(0, retentionCreditsAvailable - taxBeforeRetentions));
  return { taxableBase, exemptAmount, debitTax, purchaseTaxCredit, deductibleTaxCredit, currentRetentionCredit, prorationFactor, taxPayable, fiscalCreditCarryforward, retentionCreditCarryforward, fiscalCreditsAvailable, taxBeforeRetentions, retentionCreditsAvailable };
}
