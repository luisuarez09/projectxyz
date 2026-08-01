import type { Metadata } from "next"

import { ComplianceAssessment } from "@/components/compliance-assessment"

export const metadata: Metadata = { title: "Nueva evaluación de cumplimiento | proyectoxyz" }

export default function NewComplianceAssessmentPage() {
  return <ComplianceAssessment />
}
