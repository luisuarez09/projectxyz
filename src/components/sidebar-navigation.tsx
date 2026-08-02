"use client";

import {
  Archive,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Landmark,
  ReceiptText,
  Settings2,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCompanyContext } from "@/components/company-context";

const primaryItems = [
  { label: "Resumen", href: "/", icon: Landmark },
  { label: "Empresas", href: "/empresas", icon: Building2 },
  { label: "Calendario", href: "/calendario", icon: CalendarDays },
  { label: "Cumplimiento", href: "/cumplimiento", icon: ClipboardCheck },
  { label: "Archivo", href: "/archivo", icon: Archive },
  { label: "Equipo", href: "/equipo", icon: UsersRound },
];

const firmSettings = [
  { label: "General", href: "/configuracion/general" },
  { label: "Correo", href: "/configuracion/correo" },
  { label: "Planes", href: "/configuracion/planes" },
  { label: "Impuestos", href: "/configuracion/impuestos" },
  { label: "Servicios", href: "/configuracion/servicios" },
  { label: "Tasas de cambio", href: "/configuracion/tasas-cambio" },
];

const operations = [
  { label: "Vista general", href: "/operaciones" },
  { label: "Clientes", href: "/operaciones/clientes" },
  { label: "Proveedores", href: "/operaciones/proveedores" },
  { label: "Compras", href: "/operaciones/compras" },
  { label: "Ventas", href: "/operaciones/ventas" },
  { label: "Retenciones", href: "/operaciones/ventas?tab=retenciones" },
];

const employees = [
  { label: "Resumen", href: "/empleados" },
  { label: "Directorio", href: "/empleados/directorio" },
  { label: "Nómina", href: "/empleados/nomina" },
  { label: "Vacaciones", href: "/empleados/vacaciones" },
  { label: "Utilidades", href: "/empleados/utilidades" },
  { label: "Liquidaciones", href: "/empleados/liquidaciones" },
];

const companySettings = [
  { label: "Empresa", href: "/configuracion/empresa" },
  { label: "Plan de cuentas", href: "/configuracion/empresa/plan-cuentas" },
  { label: "Laboral", href: "/configuracion/empresa/laboral" },
];

export function SidebarNavigation(_legacyProps?: { active?: string }) {
  const pathname = usePathname();
  const { activeCompany } = useCompanyContext();
  const operationsActive = pathname.startsWith("/operaciones");
  const employeesActive = pathname.startsWith("/empleados");
  const settingsActive =
    pathname.startsWith("/configuracion") &&
    !pathname.startsWith("/configuracion/empresa");
  const companySettingsActive = pathname.startsWith("/configuracion/empresa");
  const activeSection = operationsActive
    ? "operations"
    : employeesActive
      ? "employees"
      : settingsActive
        ? "settings"
        : companySettingsActive
          ? "company-settings"
          : null;
  const [openSection, setOpenSection] = useState<
    "operations" | "employees" | "settings" | "company-settings" | null
  >(activeSection);

  useEffect(() => {
    if (activeSection) setOpenSection(activeSection);
  }, [activeSection]);

  const toggleSection = (section: NonNullable<typeof openSection>) =>
    setOpenSection((current) => (current === section ? null : section));

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Firma</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {primaryItems.map((item) => (
              <NavItem
                href={item.href}
                icon={item.icon}
                key={item.href}
                label={item.label}
                pathname={pathname}
              />
            ))}
            <CollapsibleItem
              active={settingsActive}
              icon={Settings2}
              label="Configuración"
              onToggle={() => toggleSection("settings")}
              open={openSection === "settings"}
            >
              {firmSettings.map((item) => (
                <SubItem
                  href={item.href}
                  key={item.href}
                  label={item.label}
                  pathname={pathname}
                />
              ))}
            </CollapsibleItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {activeCompany && (
        <SidebarGroup>
          <SidebarGroupLabel>Empresa activa</SidebarGroupLabel>
          <p className="truncate px-2 pb-2 text-xs font-medium text-[#14352d] group-data-[collapsible=icon]:hidden dark:text-emerald-200">
            {activeCompany.legalName}
          </p>
          <SidebarGroupContent>
            <SidebarMenu>
              <CollapsibleItem
                active={operationsActive}
                icon={ReceiptText}
                label="Operaciones"
                onToggle={() => toggleSection("operations")}
                open={openSection === "operations"}
              >
                <Suspense
                  fallback={operations.map((item) => (
                    <SubItem
                      href={item.href}
                      key={item.href}
                      label={item.label}
                      pathname={pathname}
                    />
                  ))}
                >
                  <OperationsSubItems pathname={pathname} />
                </Suspense>
              </CollapsibleItem>
              <NavItem
                href="/declaraciones"
                icon={ReceiptText}
                label="Declaraciones"
                pathname={pathname}
              />
              <NavItem
                href="/servicios"
                icon={WalletCards}
                label="Servicios"
                pathname={pathname}
              />
              <CollapsibleItem
                active={employeesActive}
                icon={UsersRound}
                label="Empleados"
                onToggle={() => toggleSection("employees")}
                open={openSection === "employees"}
              >
                {employees.map((item) => (
                  <SubItem
                    href={item.href}
                    key={item.href}
                    label={item.label}
                    pathname={pathname}
                  />
                ))}
              </CollapsibleItem>
              <NavItem
                href="/compromisos-de-pago"
                icon={Landmark}
                label="Compromisos"
                pathname={pathname}
              />
              <CollapsibleItem
                active={companySettingsActive}
                icon={Settings2}
                label="Configuración"
                onToggle={() => toggleSection("company-settings")}
                open={openSection === "company-settings"}
              >
                {companySettings.map((item) => (
                  <SubItem
                    href={item.href}
                    key={item.href}
                    label={item.label}
                    pathname={pathname}
                  />
                ))}
              </CollapsibleItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  pathname,
}: {
  href: string;
  icon: typeof Landmark;
  label: string;
  pathname: string;
}) {
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="h-10 rounded-lg px-3 text-stone-600 data-active:bg-[#e7f0e9] data-active:font-medium data-active:text-[#14352d] hover:bg-stone-100 dark:text-stone-300 dark:data-active:bg-emerald-950 dark:data-active:text-emerald-100 dark:hover:bg-stone-800"
        isActive={active}
        onClick={() => {
          if (isMobile) setOpenMobile(false);
        }}
        render={<Link href={href} />}
        tooltip={label}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CollapsibleItem({
  active,
  children,
  icon: Icon,
  label,
  onToggle,
  open,
}: {
  active: boolean;
  children: React.ReactNode;
  icon: typeof Landmark;
  label: string;
  onToggle: () => void;
  open: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-expanded={open}
        className="h-10 rounded-lg px-3 text-stone-600 data-active:bg-[#e7f0e9] data-active:font-medium data-active:text-[#14352d] hover:bg-stone-100 dark:text-stone-300 dark:data-active:bg-emerald-950 dark:data-active:text-emerald-100 dark:hover:bg-stone-800"
        isActive={active}
        onClick={onToggle}
        tooltip={label}
      >
        <Icon />
        <span>{label}</span>
        <ChevronDown
          className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </SidebarMenuButton>
      {open && <SidebarMenuSub>{children}</SidebarMenuSub>}
    </SidebarMenuItem>
  );
}

function OperationsSubItems({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  return operations.map((item) => (
    <SubItem
      currentTab={currentTab}
      href={item.href}
      key={item.href}
      label={item.label}
      pathname={pathname}
    />
  ));
}

function SubItem({
  href,
  label,
  pathname,
  currentTab,
}: {
  href: string;
  label: string;
  pathname: string;
  currentTab?: string | null;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const path = href.split("?")[0];
  const targetTab = href.includes("?")
    ? new URLSearchParams(href.split("?")[1]).get("tab")
    : null;
  const active = targetTab
    ? pathname === path && currentTab === targetTab
    : path === "/operaciones/ventas"
      ? pathname.startsWith(path) && currentTab !== "retenciones"
      : path === "/operaciones" ||
          path === "/empleados" ||
          path === "/configuracion/empresa"
        ? pathname === path
        : pathname.startsWith(path);
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        className="h-8 rounded-lg px-3 text-stone-500 data-active:bg-[#e7f0e9] data-active:font-medium data-active:text-[#14352d] dark:text-stone-400 dark:data-active:bg-emerald-950 dark:data-active:text-emerald-100"
        isActive={active}
        onClick={() => {
          if (isMobile) setOpenMobile(false);
        }}
        render={<Link href={href} />}
      >
        <span>{label}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}
