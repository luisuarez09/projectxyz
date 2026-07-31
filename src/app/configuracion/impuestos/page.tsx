import { FirmSettingsShell } from "@/components/firm-settings-shell";
import { TaxRuleSettings } from "@/components/tax-rule-settings";

export default function TaxSettingsPage() {
  return <FirmSettingsShell activeSection="impuestos"><TaxRuleSettings /></FirmSettingsShell>;
}
