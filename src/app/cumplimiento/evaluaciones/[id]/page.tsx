import type { Metadata } from "next"

import { ComplianceReport } from "@/components/compliance-report"

export const metadata: Metadata = { title: "Informe de cumplimiento | proyectoxyz" }

export default function ComplianceReportPage() {
  return <ComplianceReport />
}
