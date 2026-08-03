export const taxEvidenceOptions = [
  { kind: "SOLVENCY", label: "Solvencia" },
  { kind: "DECLARATION_RECEIPT", label: "Certificado de declaración" },
  { kind: "DECLARATION_FILE", label: "Declaración" },
  { kind: "PAYMENT_FORM", label: "Planilla de pago" },
  { kind: "PAYMENT_RECEIPT", label: "Comprobante de pago" },
] as const;

export type TaxEvidenceKind = (typeof taxEvidenceOptions)[number]["kind"];

export type EvidenceRequirement = {
  kind: TaxEvidenceKind;
  required: boolean;
  fiscalBoard: boolean;
};

export const defaultTaxEvidenceRequirements: EvidenceRequirement[] = [
  { kind: "SOLVENCY", required: false, fiscalBoard: true },
  { kind: "DECLARATION_RECEIPT", required: true, fiscalBoard: true },
  { kind: "DECLARATION_FILE", required: true, fiscalBoard: true },
  { kind: "PAYMENT_FORM", required: false, fiscalBoard: true },
  { kind: "PAYMENT_RECEIPT", required: false, fiscalBoard: true },
];

export function evidenceLabel(kind: TaxEvidenceKind) {
  return taxEvidenceOptions.find((option) => option.kind === kind)?.label ?? kind;
}
