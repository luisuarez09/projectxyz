import Link from "next/link";
import type { ReactNode } from "react";

import { ContextSelector } from "@/components/context-selector";
import { MobileSearch } from "@/components/mobile-search";
import { NotificationMenu } from "@/components/notification-menu";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const settingsSections = [
  { label: "General", href: "/configuracion/general", id: "general" },
  { label: "Servicios", href: "/configuracion/servicios", id: "servicios" },
  { label: "Impuestos", href: "/configuracion/impuestos", id: "impuestos" },
  { label: "Tasas", href: "/configuracion/tasas-cambio", id: "tasas" },
] as const;

export function FirmSettingsShell({ activeSection, children }: { activeSection: typeof settingsSections[number]["id"]; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-200 bg-white px-4 py-5 dark:border-stone-800 dark:bg-stone-900 lg:flex">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white">PX</div>
          <div><p className="font-semibold">proyectoxyz</p><p className="text-xs text-stone-500">Firma contable</p></div>
        </div>
        <SidebarNavigation active="Configuración" />
      </aside>
      <section className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-stone-200 bg-[#f7f7f4]/90 px-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:px-5 lg:px-10">
          <div className="flex items-center gap-2">
            <Link className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white lg:hidden" href="/">PX</Link>
            <ContextSelector mobile />
            <MobileSearch />
            <ContextSelector />
          </div>
          <div className="flex items-center gap-1 sm:gap-3"><NotificationMenu /><div className="hidden sm:block"><ThemeToggle /></div><UserMenu /></div>
        </header>
        <nav aria-label="Secciones de configuración de la firma" className="border-b border-stone-200 bg-white px-4 dark:border-stone-800 dark:bg-stone-900 lg:hidden">
          <div className="flex gap-1 overflow-x-auto py-2">
            {settingsSections.map((item) => <Link className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${activeSection === item.id ? "bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100" : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"}`} href={item.href} key={item.id}>{item.label}</Link>)}
          </div>
        </nav>
        {children}
      </section>
    </main>
  );
}
