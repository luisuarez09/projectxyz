import type { Metadata } from "next"

import { ComplianceSettings } from "@/components/compliance-settings"

export const metadata: Metadata = { title: "Configurar cumplimiento | proyectoxyz" }

export default function ComplianceSettingsPage() {
  return <ComplianceSettings />
}
