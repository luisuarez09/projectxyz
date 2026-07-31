import { CompanyChartOfAccounts } from "@/components/company-chart-of-accounts";
import { CompanySettingsShell } from "@/components/company-settings-shell";

export default function CompanyChartOfAccountsPage() {
  return <CompanySettingsShell activeSection="plan-cuentas"><CompanyChartOfAccounts /></CompanySettingsShell>;
}
