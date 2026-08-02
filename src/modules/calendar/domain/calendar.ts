export type ComplianceCaseStatus =
  | "PENDING"
  | "PREPARING"
  | "READY_FOR_REVIEW"
  | "SUBMITTED"
  | "PAID"
  | "CLOSED"
  | "INCIDENT"
  | "NOT_APPLICABLE";

export type ComplianceActivityMode =
  | "WITH_ACTIVITY"
  | "WITHOUT_ACTIVITY";

export type DeadlineStatus =
  | "OVERDUE"
  | "DUE_SOON"
  | "ON_TRACK"
  | "NO_DUE_DATE";

export type CalendarViewMode = "due" | "period";

export type CalendarCompanyView = {
  id: string;
  legalName: string;
  activity: string;
  responsibleName: string;
};

export type CalendarEvidenceView = {
  id: string;
  kind:
    | "SOLVENCY"
    | "DECLARATION_RECEIPT"
    | "DECLARATION_FILE"
    | "PAYMENT_FORM"
    | "PAYMENT_RECEIPT"
    | "INVOICE"
    | "OTHER";
  originalName: string;
  status: "PENDING" | "QUARANTINED" | "AVAILABLE" | "REJECTED" | "ARCHIVED";
};

export type CalendarEvidenceRequirement = {
  kind:
    | "SOLVENCY"
    | "DECLARATION_RECEIPT"
    | "DECLARATION_FILE"
    | "PAYMENT_FORM"
    | "PAYMENT_RECEIPT";
  required: boolean;
};

export type CalendarCaseView = {
  id: string;
  version: number;
  companyId: string;
  companyName: string;
  business: string;
  owner: string;
  offeringId: string;
  offeringName: string;
  offeringKind: "TAX" | "SERVICE";
  organism: string;
  periodKey: string;
  periodLabel: string;
  cadence: string;
  regime: string;
  deadlineBasis: string;
  dueDate: string;
  status: ComplianceCaseStatus;
  deadlineStatus: DeadlineStatus;
  activityMode: ComplianceActivityMode | null;
  filedAt: string;
  paidAt: string;
  amount: string;
  evidenceRequirements: CalendarEvidenceRequirement[];
  evidences: CalendarEvidenceView[];
};

export type CalendarPeriodView = {
  key: string;
  label: string;
  previous: string;
  next: string;
};

export type CalendarView = {
  viewMode: CalendarViewMode;
  period: CalendarPeriodView;
  companies: CalendarCompanyView[];
  cases: CalendarCaseView[];
  canManage: boolean;
  canReset: boolean;
};

export type AnnualStatusKind = "TAX" | "SERVICE";

export type AnnualStatus =
  | "COMPLETED"
  | "REGISTERED"
  | "PENDING"
  | "FUTURE"
  | "NOT_APPLICABLE";

export type AnnualStatusRow = {
  offeringId: string;
  name: string;
  organism: string;
  cadence: string;
  deadlineBasis: string;
  href: string;
  statuses: AnnualStatus[];
};

export type AnnualStatusOverview = {
  year: number;
  kind: AnnualStatusKind;
  company: { id: string; legalName: string };
  rows: AnnualStatusRow[];
  summary: {
    completed: number;
    pending: number;
    registered: number;
  };
};
