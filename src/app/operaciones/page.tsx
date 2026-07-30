import { ArrowRight, Building2, ReceiptText, UsersRound } from "lucide-react";
import Link from "next/link";

import { ContextSelector } from "@/components/context-selector";
import { MobileSearch } from "@/components/mobile-search";
import { NotificationMenu } from "@/components/notification-menu";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const modules = [
  { name: "Clientes comerciales", description: "Compradores, datos fiscales y documentos asociados.", icon: UsersRound },
  { name: "Proveedores", description: "Terceros, datos fiscales y condiciones de registro.", icon: Building2 },
  { name: "Compras y ventas", description: "Documentos que alimentarán libros y retenciones.", icon: ReceiptText },
];

export default function OperationsPage() {
  return <main className="min-h-screen bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-200 bg-white px-4 py-5 dark:border-stone-800 dark:bg-stone-900 lg:flex"><div className="mb-10 flex items-center gap-3 px-2"><div className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white">PX</div><div><p className="font-semibold">proyectoxyz</p><p className="text-xs text-stone-500">Firma contable</p></div></div><SidebarNavigation active="Operaciones" /></aside>
    <section className="lg:pl-64"><header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-stone-200 bg-[#f7f7f4]/90 px-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:px-5 lg:px-10"><div className="flex items-center gap-2"><Link className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white lg:hidden" href="/">PX</Link><ContextSelector mobile /><MobileSearch /><ContextSelector /></div><div className="flex items-center gap-1 sm:gap-3"><NotificationMenu /><div className="hidden sm:block"><ThemeToggle /></div><UserMenu /></div></header>
      <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10"><p className="text-sm text-stone-500">Empresa activa / Operaciones</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Operaciones comerciales</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Aquí se concentrará el registro trazable de compras, ventas y sus contrapartes. Los datos servirán como base para libros, retenciones y obligaciones de la empresa.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{modules.map(({ name, description, icon: Icon }) => <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900" key={name}><div className="grid size-10 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><Icon size={19} /></div><h2 className="mt-4 font-semibold">{name}</h2><p className="mt-2 text-sm leading-5 text-stone-500">{description}</p><button className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#14352d]" type="button">Próximamente <ArrowRight size={15} /></button></article>)}</div></div>
    </section>
  </main>;
}
