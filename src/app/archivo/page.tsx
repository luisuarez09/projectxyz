import { Menu } from "lucide-react";
import Link from "next/link";

import { ArchiveBuilder } from "@/components/archive-builder";
import { ContextSelector } from "@/components/context-selector";
import { MobileSearch } from "@/components/mobile-search";
import { NotificationMenu } from "@/components/notification-menu";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export default function ArchivePage() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-200 bg-white px-4 py-5 dark:border-stone-800 dark:bg-stone-900 lg:flex">
        <Link className="mb-10 flex items-center gap-3 px-2" href="/">
          <div className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white">PX</div>
          <div><p className="font-semibold">proyectoxyz</p><p className="text-xs text-stone-500">Firma contable</p></div>
        </Link>
        <SidebarNavigation active="Archivo" />
      </aside>
      <section className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-stone-200 bg-[#f7f7f4]/90 px-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:px-5 lg:px-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <details className="group relative lg:hidden">
              <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-lg text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800 [&::-webkit-details-marker]:hidden" aria-label="Abrir menú de navegación"><Menu size={21} /></summary>
              <div className="absolute left-0 top-12 z-40 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900">
                <div className="mb-3 flex items-center gap-3 border-b border-stone-100 px-2 pb-3 dark:border-stone-800"><div className="grid size-8 place-items-center rounded-lg bg-[#14352d] text-xs font-bold text-white">PX</div><div><p className="text-sm font-semibold">proyectoxyz</p><p className="text-xs text-stone-500">Firma contable</p></div></div>
                <SidebarNavigation active="Archivo" />
              </div>
            </details>
            <Link className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white lg:hidden" href="/">PX</Link>
            <ContextSelector mobile />
            <MobileSearch />
            <ContextSelector />
          </div>
          <div className="flex items-center gap-1 sm:gap-3"><NotificationMenu /><div className="hidden sm:block"><ThemeToggle /></div><div className="hidden h-7 w-px bg-stone-200 sm:block dark:bg-stone-700" /><UserMenu /></div>
        </header>
        <ArchiveBuilder />
      </section>
    </main>
  );
}
