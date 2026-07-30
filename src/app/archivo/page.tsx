import { Archive, FileOutput, Tags } from "lucide-react";
import Link from "next/link";

import { ContextSelector } from "@/components/context-selector";
import { MobileSearch } from "@/components/mobile-search";
import { NotificationMenu } from "@/components/notification-menu";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export default function ArchivePage() {
  return <main className="min-h-screen bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-200 bg-white px-4 py-5 dark:border-stone-800 dark:bg-stone-900 lg:flex"><div className="mb-10 flex items-center gap-3 px-2"><div className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white">PX</div><div><p className="font-semibold">proyectoxyz</p><p className="text-xs text-stone-500">Firma contable</p></div></div><SidebarNavigation active="Archivo" /></aside>
    <section className="lg:pl-64"><header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-stone-200 bg-[#f7f7f4]/90 px-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:px-5 lg:px-10"><div className="flex items-center gap-2"><Link className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white lg:hidden" href="/">PX</Link><ContextSelector mobile /><MobileSearch /><ContextSelector /></div><div className="flex items-center gap-1 sm:gap-3"><NotificationMenu /><div className="hidden sm:block"><ThemeToggle /></div><UserMenu /></div></header>
      <div className="mx-auto max-w-4xl px-5 py-8 lg:px-10"><p className="text-sm text-stone-500">Empresa activa / Archivo</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Archivo físico y entregables</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Esta sección preparará una carpeta ordenada por período, a partir de documentos y evidencias ya cargados y aprobados en el sistema.</p><div className="mt-8 grid gap-4 sm:grid-cols-3">{[[Archive, "Carpeta consolidada", "Certificados, declaraciones y comprobantes por período."], [FileOutput, "Salida en PDF", "Un solo archivo listo para imprimir o entregar."], [Tags, "Identificación física", "Encabezados y lomos de carpeta para cada empresa."]].map(([Icon, title, description]) => { const Visual = Icon as typeof Archive; return <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900" key={title as string}><Visual className="text-[#14352d] dark:text-emerald-200" size={21} /><h2 className="mt-4 font-semibold">{title as string}</h2><p className="mt-2 text-sm leading-5 text-stone-500">{description as string}</p></div>; })}</div><div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white/60 p-5 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-300">El generador aún no está habilitado: primero definiremos el orden documental, los requisitos por tipo de obligación y las plantillas de impresión.</div></div>
    </section>
  </main>;
}
