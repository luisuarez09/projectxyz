import { FirmMailSettings } from "@/components/firm-mail-settings";
import { FirmSettingsShell } from "@/components/firm-settings-shell";

export default function FirmMailSettingsPage() {
  return <FirmSettingsShell activeSection="correo"><FirmMailSettings /></FirmSettingsShell>;
}
