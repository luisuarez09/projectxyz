import { ExchangeRateSettings } from "@/components/exchange-rate-settings";
import { FirmSettingsShell } from "@/components/firm-settings-shell";

export default function ExchangeRateSettingsPage() {
  return <FirmSettingsShell activeSection="tasas"><ExchangeRateSettings /></FirmSettingsShell>;
}
