import { FirmGeneralSettings } from "@/components/firm-general-settings";
import { FirmSettingsShell } from "@/components/firm-settings-shell";

export default function FirmGeneralSettingsPage() {
  return <FirmSettingsShell activeSection="general"><FirmGeneralSettings /></FirmSettingsShell>;
}
