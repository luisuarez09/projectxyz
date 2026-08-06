export type IvaBookRetentionInput = {
  receiptNumber: string;
  percentage: number;
  amount: number;
};

export type IvaBookDocumentInput = {
  id: string;
  date: string;
  partyName: string;
  rif: string;
  documentNumber: string;
  taxableBase: number;
  exemptAmount: number;
  nonTaxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  vatRate: number;
  taxRateName: string;
  retentions: IvaBookRetentionInput[];
  vatCreditStatus?: "PENDING" | "APPLIED" | "EXCLUDED" | null;
  hasVatCredit?: boolean;
};

export type IvaBookCompany = {
  legalName: string;
  rif: string;
  fiscalAddress: string;
};

export type IvaTaxBucket = {
  base: number;
  rate: number;
  tax: number;
};

export type IvaSalesBookRow = {
  operation: number;
  date: string;
  rif: string;
  partyName: string;
  invoiceNumber: string;
  controlNumber: string;
  debitNoteNumber: string;
  creditNoteNumber: string;
  exportDeclarationNumber: string;
  retentionReceiptNumber: string;
  affectedInvoiceNumber: string;
  totalAmount: number;
  exemptAmount: number;
  exoneratedAmount: number;
  nonTaxableAmount: number;
  exportSales: IvaTaxBucket;
  generalSales: IvaTaxBucket;
  reducedSales: IvaTaxBucket;
  specialTaxpayer: "Sí" | "No";
  retentionPercentage: number;
  retainedVat: number;
};

export type IvaPurchaseBookRow = {
  operation: number;
  date: string;
  rif: string;
  partyName: string;
  invoiceNumber: string;
  debitNoteNumber: string;
  creditNoteNumber: string;
  importFormNumber: string;
  retentionReceiptNumber: string;
  affectedInvoiceNumber: string;
  totalAmount: number;
  exemptAmount: number;
  exoneratedAmount: number;
  nonTaxableAmount: number;
  noCreditAmount: number;
  importGeneral: IvaTaxBucket;
  importReduced: IvaTaxBucket;
  nationalGeneral: IvaTaxBucket;
  nationalReduced: IvaTaxBucket;
  specialTaxpayer: "Sí" | "No";
  retentionPercentage: number;
  retainedVat: number;
};

export type IvaBookSummary = {
  sales: {
    general: IvaTaxBucket;
    reduced: IvaTaxBucket;
    additional: IvaTaxBucket;
    exemptAmount: number;
    exoneratedAmount: number;
    nonTaxableAmount: number;
    exportAmount: number;
    totalBase: number;
    totalDebit: number;
  };
  purchases: {
    noCreditAmount: number;
    exemptAmount: number;
    exoneratedAmount: number;
    nonTaxableAmount: number;
    importGeneral: IvaTaxBucket;
    importReduced: IvaTaxBucket;
    importAdditional: IvaTaxBucket;
    nationalGeneral: IvaTaxBucket;
    nationalReduced: IvaTaxBucket;
    nationalAdditional: IvaTaxBucket;
    totalBase: number;
    totalCredit: number;
  };
};

export type IvaFiscalBookSnapshot = {
  version: 1;
  generatedAt: string;
  period: string;
  periodLabel: string;
  company: IvaBookCompany;
  source: {
    model: string;
    ruleSource: string;
    ruleVersion: number;
  };
  sales: IvaSalesBookRow[];
  purchases: IvaPurchaseBookRow[];
  summary: IvaBookSummary;
  warnings: string[];
};

function rounded(value: number) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function sum(values: number[]) {
  return rounded(values.reduce((total, value) => total + value, 0));
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function rateKind(document: IvaBookDocumentInput) {
  const name = normalize(document.taxRateName);
  if (name.includes("reduc")) return "REDUCED" as const;
  if (name.includes("adicional")) return "ADDITIONAL" as const;
  return "GENERAL" as const;
}

function bucket(document: IvaBookDocumentInput, expected: "GENERAL" | "REDUCED" | "ADDITIONAL"): IvaTaxBucket {
  const isExcluded = document.vatCreditStatus === "EXCLUDED" || document.hasVatCredit === false;
  if (isExcluded) {
    return { base: 0, rate: 0, tax: 0 };
  }
  const documentRateKind = rateKind(document);
  const effectiveRate = document.vatRate > 0
    ? document.vatRate
    : document.taxableBase > 0 && document.taxAmount > 0
      ? document.taxAmount / document.taxableBase * 100
      : 0;
  if (document.taxAmount <= 0 || documentRateKind !== expected)
    return { base: 0, rate: documentRateKind === expected ? rounded(effectiveRate) : 0, tax: 0 };
  return { base: rounded(document.taxableBase), rate: rounded(effectiveRate), tax: rounded(document.taxAmount) };
}

function aggregateBuckets(buckets: IvaTaxBucket[]): IvaTaxBucket {
  const active = buckets.filter(({ base, tax }) => base !== 0 || tax !== 0);
  const rates = new Set(active.map(({ rate }) => rounded(rate)));
  return {
    base: sum(active.map(({ base }) => base)),
    rate: rates.size === 1 ? active[0]?.rate ?? 0 : 0,
    tax: sum(active.map(({ tax }) => tax)),
  };
}

function retentionTotals(retentions: IvaBookRetentionInput[]) {
  const percentages = new Set(retentions.map(({ percentage }) => rounded(percentage)).filter(Boolean));
  return {
    receiptNumber: retentions.map(({ receiptNumber }) => receiptNumber).filter(Boolean).join(", "),
    percentage: percentages.size === 1 ? [...percentages][0] : 0,
    amount: sum(retentions.map(({ amount }) => amount)),
  };
}

function purchaseNoCreditAmount(document: IvaBookDocumentInput) {
  const isExcluded = document.vatCreditStatus === "EXCLUDED" || document.hasVatCredit === false;
  if (isExcluded) {
    return rounded(document.totalAmount);
  }
  const taxableWithoutTax = document.taxAmount === 0 ? document.taxableBase : 0;
  const classified = document.taxableBase + document.exemptAmount + document.nonTaxableAmount + document.taxAmount;
  const reconciliationDifference = Math.max(0, document.totalAmount - classified);
  return rounded(taxableWithoutTax + reconciliationDifference);
}

export function buildIvaFiscalBookSnapshot(input: {
  generatedAt?: string;
  period: string;
  periodLabel: string;
  company: IvaBookCompany;
  source: { ruleSource: string; ruleVersion: number };
  sales: IvaBookDocumentInput[];
  purchases: IvaBookDocumentInput[];
}): IvaFiscalBookSnapshot {
  const warnings = [
    "El registro comercial actual no captura número de control, notas de débito o crédito, factura afectada ni planilla de importación; esas columnas permanecen vacías.",
    "La clasificación de alícuota usa el nombre y la tasa vigentes guardados con cada documento. Revisa la vista preliminar antes del cierre.",
  ];
  const sales = input.sales.map((document, index): IvaSalesBookRow => {
    const retention = retentionTotals(document.retentions);
    return {
      operation: index + 1,
      date: document.date,
      rif: document.rif,
      partyName: document.partyName,
      invoiceNumber: document.documentNumber,
      controlNumber: "",
      debitNoteNumber: "",
      creditNoteNumber: "",
      exportDeclarationNumber: "",
      retentionReceiptNumber: retention.receiptNumber,
      affectedInvoiceNumber: "",
      totalAmount: rounded(document.totalAmount),
      exemptAmount: rounded(document.exemptAmount),
      exoneratedAmount: 0,
      nonTaxableAmount: rounded(document.nonTaxableAmount),
      exportSales: { base: 0, rate: 0, tax: 0 },
      generalSales: bucket(document, "GENERAL"),
      reducedSales: bucket(document, "REDUCED"),
      specialTaxpayer: document.retentions.length ? "Sí" : "No",
      retentionPercentage: retention.percentage,
      retainedVat: retention.amount,
    };
  });
  const purchases = input.purchases.map((document, index): IvaPurchaseBookRow => {
    const retention = retentionTotals(document.retentions);
    return {
      operation: index + 1,
      date: document.date,
      rif: document.rif,
      partyName: document.partyName,
      invoiceNumber: document.documentNumber,
      debitNoteNumber: "",
      creditNoteNumber: "",
      importFormNumber: "",
      retentionReceiptNumber: retention.receiptNumber,
      affectedInvoiceNumber: "",
      totalAmount: rounded(document.totalAmount),
      exemptAmount: rounded(document.exemptAmount),
      exoneratedAmount: 0,
      nonTaxableAmount: rounded(document.nonTaxableAmount),
      noCreditAmount: purchaseNoCreditAmount(document),
      importGeneral: { base: 0, rate: 0, tax: 0 },
      importReduced: { base: 0, rate: 0, tax: 0 },
      nationalGeneral: bucket(document, "GENERAL"),
      nationalReduced: bucket(document, "REDUCED"),
      specialTaxpayer: document.retentions.length ? "Sí" : "No",
      retentionPercentage: retention.percentage,
      retainedVat: retention.amount,
    };
  });
  const salesGeneral = aggregateBuckets(sales.map(({ generalSales }) => generalSales));
  const salesReduced = aggregateBuckets(sales.map(({ reducedSales }) => reducedSales));
  const salesAdditional = aggregateBuckets(input.sales.map((document) => bucket(document, "ADDITIONAL")));
  const purchaseGeneral = aggregateBuckets(purchases.map(({ nationalGeneral }) => nationalGeneral));
  const purchaseReduced = aggregateBuckets(purchases.map(({ nationalReduced }) => nationalReduced));
  const purchaseAdditional = aggregateBuckets(input.purchases.map((document) => bucket(document, "ADDITIONAL")));
  if (salesAdditional.base || purchaseAdditional.base)
    warnings.push("El modelo de libro aportado no contiene una columna separada para la alícuota adicional; el importe se conserva en el resumen del período.");

  const summary: IvaBookSummary = {
    sales: {
      general: salesGeneral,
      reduced: salesReduced,
      additional: salesAdditional,
      exemptAmount: sum(sales.map(({ exemptAmount }) => exemptAmount)),
      exoneratedAmount: sum(sales.map(({ exoneratedAmount }) => exoneratedAmount)),
      nonTaxableAmount: sum(sales.map(({ nonTaxableAmount }) => nonTaxableAmount)),
      exportAmount: sum(sales.map(({ exportSales }) => exportSales.base)),
      totalBase: sum(input.sales.map(({ taxableBase, exemptAmount, nonTaxableAmount }) => taxableBase + exemptAmount + nonTaxableAmount)),
      totalDebit: sum(input.sales.map(({ taxAmount }) => taxAmount)),
    },
    purchases: {
      noCreditAmount: sum(purchases.map(({ noCreditAmount }) => noCreditAmount)),
      exemptAmount: sum(purchases.map(({ exemptAmount }) => exemptAmount)),
      exoneratedAmount: sum(purchases.map(({ exoneratedAmount }) => exoneratedAmount)),
      nonTaxableAmount: sum(purchases.map(({ nonTaxableAmount }) => nonTaxableAmount)),
      importGeneral: { base: 0, rate: 0, tax: 0 },
      importReduced: { base: 0, rate: 0, tax: 0 },
      importAdditional: { base: 0, rate: 0, tax: 0 },
      nationalGeneral: purchaseGeneral,
      nationalReduced: purchaseReduced,
      nationalAdditional: purchaseAdditional,
      totalBase: sum(input.purchases.map(({ taxableBase, exemptAmount, nonTaxableAmount }) => taxableBase + exemptAmount + nonTaxableAmount)),
      totalCredit: sum(input.purchases.map(({ taxAmount }) => taxAmount)),
    },
  };
  return {
    version: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    period: input.period,
    periodLabel: input.periodLabel,
    company: input.company,
    source: {
      model: "Modelo IVA aportado por el usuario y Forma IVA 99030 SENIAT",
      ruleSource: input.source.ruleSource,
      ruleVersion: input.source.ruleVersion,
    },
    sales,
    purchases,
    summary,
    warnings,
  };
}
