"use client";

import { Building2 } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CompanyProvider, useCompanyContext } from "@/components/company-context";
import { MobileSearch } from "@/components/mobile-search";
import { NotificationMenu } from "@/components/notification-menu";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = ["/login", "/recuperar-acceso", "/invitacion"].some((route) => pathname.startsWith(route));
  if (pathname.startsWith("/calendario/matriz/tv") || isAuthPage) return children;
  return <CompanyProvider><AuthenticatedShell>{children}</AuthenticatedShell></CompanyProvider>;
}

function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { activeCompany, companies, loading, selecting, selectCompany } = useCompanyContext();
  return (
    <SidebarProvider style={{ "--sidebar-width": "17.5rem" } as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-[#f7f7f4]/90 px-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="size-9" />
            <Select disabled={loading || selecting} onValueChange={(value) => void selectCompany(value === "firm" ? null : value)} value={activeCompany?.id ?? "firm"}>
              <SelectTrigger aria-label="Seleccionar empresa activa" className="h-9 w-auto min-w-44 max-w-[min(22rem,62vw)] border-stone-200 bg-white px-3 shadow-none dark:border-stone-700 dark:bg-stone-900">
                <Building2 className="text-[#14352d] dark:text-emerald-300" />
                <SelectValue className="truncate font-medium">{loading ? "Cargando empresas…" : activeCompany?.legalName ?? "Firma completa"}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="firm">
                  <Building2 />
                  <span><span className="block">Firma completa</span><span className="block text-xs text-stone-500">Sin empresa activa</span></span>
                </SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <Building2 />
                    <span className="min-w-0"><span className="block truncate">{company.legalName}</span>{company.id === activeCompany?.id && <span className="block text-xs text-emerald-700 dark:text-emerald-300">Empresa activa</span>}</span>
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
  );
}

function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 p-4 pb-7">
        <div className="flex h-10 items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white">PX</div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate font-semibold">proyectoxyz</p><p className="text-xs text-muted-foreground">Firma contable</p></div>
        </div>
      </SidebarHeader>
      <SidebarContent><SidebarNavigation /></SidebarContent>
      <SidebarFooter className="p-4" />
      <SidebarRail />
    </Sidebar>
  );
}
