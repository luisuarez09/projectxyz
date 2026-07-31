"use client"

import {
  Archive,
  Building2,
  CalendarDays,
  ChevronDown,
  Landmark,
  ReceiptText,
  Settings2,
  UsersRound,
  WalletCards,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

const primaryItems = [
  { label: "Resumen", href: "/", icon: Landmark },
  { label: "Empresas", href: "/empresas", icon: Building2 },
  { label: "Calendario", href: "/calendario", icon: CalendarDays },
  { label: "Archivo", href: "/archivo", icon: Archive },
  { label: "Equipo", href: "/equipo", icon: UsersRound },
]

const firmSettings = [
  { label: "General", href: "/configuracion/general" },
  { label: "Planes de servicio", href: "/configuracion/planes" },
  { label: "Catálogo de servicios", href: "/configuracion/servicios" },
  { label: "Impuestos", href: "/configuracion/impuestos" },
  { label: "Tasas de cambio", href: "/configuracion/tasas-cambio" },
]

const operations = [
  { label: "Vista general", href: "/operaciones" },
  { label: "Clientes", href: "/operaciones/clientes" },
  { label: "Proveedores", href: "/operaciones/proveedores" },
  { label: "Compras", href: "/operaciones/compras" },
  { label: "Ventas", href: "/operaciones/ventas" },
  { label: "Retenciones", href: "/operaciones/ventas?tab=retenciones" },
]

export function SidebarNavigation(_legacyProps?: { active?: string }) {
  const pathname = usePathname()
  const operationsActive = pathname.startsWith("/operaciones")
  const settingsActive = pathname.startsWith("/configuracion") && pathname !== "/configuracion/empresa"
  const [operationsOpen, setOperationsOpen] = useState(operationsActive)
  const [settingsOpen, setSettingsOpen] = useState(settingsActive)

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Firma</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {primaryItems.map((item) => (
              <NavItem href={item.href} icon={item.icon} key={item.href} label={item.label} pathname={pathname} />
            ))}
            <CollapsibleItem active={settingsActive} icon={Settings2} label="Configuración" onToggle={() => setSettingsOpen((open) => !open)} open={settingsOpen}>
              {firmSettings.map((item) => <SubItem href={item.href} key={item.href} label={item.label} pathname={pathname} />)}
            </CollapsibleItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Empresa activa</SidebarGroupLabel>
        <p className="truncate px-2 pb-2 text-xs font-medium text-[#14352d] group-data-[collapsible=icon]:hidden dark:text-emerald-200">
          Distribuidora El Roble, C.A.
        </p>
        <SidebarGroupContent>
          <SidebarMenu>
            <CollapsibleItem active={operationsActive} icon={ReceiptText} label="Operaciones" onToggle={() => setOperationsOpen((open) => !open)} open={operationsOpen}>
              {operations.map((item) => <SubItem href={item.href} key={item.href} label={item.label} pathname={pathname} />)}
            </CollapsibleItem>
            <NavItem href="/declaraciones" icon={ReceiptText} label="Declaraciones" pathname={pathname} />
            <NavItem href="/servicios" icon={WalletCards} label="Servicios" pathname={pathname} />
            <SidebarMenuItem>
              <SidebarMenuButton aria-disabled tooltip="Empleados">
                <UsersRound />
                <span>Empleados</span>
              </SidebarMenuButton>
              <SidebarMenuBadge>Próx.</SidebarMenuBadge>
            </SidebarMenuItem>
            <NavItem href="/compromisos-de-pago" icon={Landmark} label="Compromisos de pago" pathname={pathname} />
            <NavItem href="/configuracion/empresa" icon={Settings2} label="Configuración empresa" pathname={pathname} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}

function NavItem({ href, icon: Icon, label, pathname }: { href: string; icon: typeof Landmark; label: string; pathname: string }) {
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="h-10 rounded-lg px-3 text-stone-600 data-active:bg-[#e7f0e9] data-active:font-medium data-active:text-[#14352d] hover:bg-stone-100 dark:text-stone-300 dark:data-active:bg-emerald-950 dark:data-active:text-emerald-100 dark:hover:bg-stone-800"
        isActive={active}
        render={<Link href={href} />}
        tooltip={label}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function CollapsibleItem({ active, children, icon: Icon, label, onToggle, open }: { active: boolean; children: React.ReactNode; icon: typeof Landmark; label: string; onToggle: () => void; open: boolean }) {
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
        <ChevronDown className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </SidebarMenuButton>
      {open && <SidebarMenuSub>{children}</SidebarMenuSub>}
    </SidebarMenuItem>
  )
}

function SubItem({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const path = href.split("?")[0]
  const active = path === "/operaciones" ? pathname === path : pathname.startsWith(path)
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        className="h-8 rounded-lg px-3 text-stone-500 data-active:bg-[#e7f0e9] data-active:font-medium data-active:text-[#14352d] dark:text-stone-400 dark:data-active:bg-emerald-950 dark:data-active:text-emerald-100"
        isActive={active}
        render={<Link href={href} />}
      >
        <span>{label}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}
