import type { Metadata } from "next"

import { ComplianceOverview } from "@/components/compliance-overview"

export const metadata: Metadata = { title: "Cumplimiento formal | proyectoxyz" }

export default function CompliancePage() {
  return <ComplianceOverview />
}
