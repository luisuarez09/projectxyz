import type { DeadlineRule } from "@/lib/deadline-rules";
import type { EvidenceRequirement } from "@/lib/evidence-requirements";

export type OfferingKind = "TAX" | "SERVICE";
export type TaxpayerCondition = "ORDINARY" | "SPECIAL_TAXPAYER" | "ALL";
export type OfferingTemplate = "iva" | "dpp" | "inces" | "ivss" | "faov" | "none";

export type FirmOffering = {
  id: string;
  version: number;
  key: string;
  kind: OfferingKind;
  taxpayerCondition: TaxpayerCondition;
  name: string;
  organism: string;
  frequency: string;
  speFrequency: string;
  speCalendarGroup: string;
  deadline: DeadlineRule;
  evidenceRequirements: EvidenceRequirement[];
  template: OfferingTemplate;
  source: string;
  appliesFrom: string;
  appliesTo: string;
  active: boolean;
};

export type TaxRate = {
  id: string;
  version: number;
  offeringId: string;
  name: string;
  rate: string;
  appliesFrom: string;
  appliesTo: string;
  source: string;
  active: boolean;
};

export type FiscalCalendarDate = {
  rif: string;
  dates: Record<string, string>;
};

export type FiscalCalendarMatrix = {
  id: string;
  key: string;
  groupId: string;
  label: string;
  shortLabel: string;
  cadence: string;
  period: string;
  offeringIds: string[];
  obligations: string[];
  columns: string[];
  rows: FiscalCalendarDate[];
  note?: string;
};

export type FiscalCalendar = {
  id: string;
  version: number;
  key: string;
  name: string;
  year: number;
  taxpayerCondition: "SPECIAL_TAXPAYER" | "ORDINARY" | "ALL";
  appliesFrom: string;
  appliesTo: string;
  sourceGazette: string;
  sourcePublishedAt: string;
  sourceProvision: string;
  sourceIssuedAt: string;
  sourceNote: string;
  active: boolean;
  matrices: FiscalCalendarMatrix[];
};

export type FirmCatalog = {
  offerings: FirmOffering[];
  taxRates: TaxRate[];
  calendars: FiscalCalendar[];
  canManage: boolean;
  canReconcile: boolean;
};
