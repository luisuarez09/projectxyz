import { FirmChartOfAccountsTemplate } from "@/components/firm-chart-of-accounts-template";
import { FirmSettingsShell } from "@/components/firm-settings-shell";

export default function FirmChartOfAccountsTemplatePage() {
  return <FirmSettingsShell activeSection="plan-cuentas-base"><FirmChartOfAccountsTemplate /></FirmSettingsShell>;
}
