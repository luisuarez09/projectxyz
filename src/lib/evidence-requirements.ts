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
};

export const defaultTaxEvidenceRequirements: EvidenceRequirement[] = [
  { kind: "DECLARATION_RECEIPT", required: true },
  { kind: "DECLARATION_FILE", required: true },
  { kind: "PAYMENT_FORM", required: false },
  { kind: "PAYMENT_RECEIPT", required: false },
];

export function evidenceLabel(kind: TaxEvidenceKind) {
  return taxEvidenceOptions.find((option) => option.kind === kind)?.label ?? kind;
}
