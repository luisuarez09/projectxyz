import { FirmSettingsShell } from "@/components/firm-settings-shell";
import { ServiceCatalogSettings } from "@/components/service-catalog-settings";

export default function ServiceSettingsPage() {
  return <FirmSettingsShell activeSection="servicios"><ServiceCatalogSettings /></FirmSettingsShell>;
}
