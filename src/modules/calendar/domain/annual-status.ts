import type { AnnualStatus, ComplianceCaseStatus } from "@/modules/calendar/domain/calendar";

type AnnualCaseStatus = { status: ComplianceCaseStatus };

export function summarizeAnnualMonth(
  cases: AnnualCaseStatus[],
  monthStart: Date,
  today: Date,
): AnnualStatus {
  if (!cases.length || cases.every(({ status }) => status === "NOT_APPLICABLE"))
    return "NOT_APPLICABLE";

  const currentMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  if (
    monthStart > currentMonth &&
    cases.every(({ status }) => ["PENDING", "NOT_APPLICABLE"].includes(status))
  )
    return "FUTURE";

  if (
    cases.some(({ status }) =>
      ["PENDING", "PREPARING", "READY_FOR_REVIEW", "INCIDENT"].includes(status),
    )
  )
    return "PENDING";
  if (cases.some(({ status }) => status === "SUBMITTED")) return "REGISTERED";
  if (cases.every(({ status }) => ["PAID", "CLOSED", "NOT_APPLICABLE"].includes(status)))
    return "COMPLETED";
  return "PENDING";
}
