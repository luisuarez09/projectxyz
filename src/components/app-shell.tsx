"use client"

import { Building2 } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { SidebarNavigation } from "@/components/sidebar-navigation"
import { MobileSearch } from "@/components/mobile-search"
import { NotificationMenu } from "@/components/notification-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"

const companies = [
  { label: "Firma completa", value: "firm" },
  { label: "Distribuidora El Roble, C.A.", value: "roble", initials: "ER" },
  { label: "Nueva Confitería del Sur, C.A.", value: "confiteria", initials: "NC" },
  { label: "Servicios Los Andes, C.A.", value: "andes", initials: "LA" },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = ["/login", "/recuperar-acceso", "/invitacion"].some((route) => pathname.startsWith(route))
  const companyArea = pathname.startsWith("/operaciones") || pathname.startsWith("/declaraciones") || pathname.startsWith("/servicios") || pathname.startsWith("/empleados") || pathname.startsWith("/compromisos-de-pago") || pathname.startsWith("/configuracion/empresa")
  const [company, setCompany] = useState(companyArea ? "roble" : "firm")

  useEffect(() => {
    if (companyArea && company === "firm") setCompany("roble")
  }, [company, companyArea])

  if (pathname.startsWith("/calendario/matriz/tv") || isAuthPage) return children

  return (
    <SidebarProvider style={{ "--sidebar-width": "17.5rem" } as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-[#f7f7f4]/90 px-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="size-9" />
            <Select items={companies} onValueChange={(nextValue) => setCompany(nextValue ?? "firm")} value={company}>
              <SelectTrigger className="h-9 w-auto min-w-44 border-stone-200 bg-white px-3 shadow-none dark:border-stone-700 dark:bg-stone-900">
                <Building2 className="text-[#14352d] dark:text-emerald-300" />
                <SelectValue className="font-medium" />
              </SelectTrigger>
              <SelectContent align="start">
                {companies.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <Building2 />
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MobileSearch />
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <NotificationMenu />
            <div className="hidden sm:block"><ThemeToggle /></div>
            <div className="hidden h-7 w-px bg-stone-200 sm:block dark:bg-stone-700" />
            <UserMenu />
          </div>
        </header>
        <div className="app-shell-content min-w-0 max-w-full flex-1 overflow-x-clip">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 p-4 pb-7">
        <div className="flex h-10 items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white">PX</div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-semibold">proyectoxyz</p>
            <p className="text-xs text-muted-foreground">Firma contable</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNavigation />
      </SidebarContent>
      <SidebarFooter className="p-4" />
      <SidebarRail />
    </Sidebar>
  )
}
