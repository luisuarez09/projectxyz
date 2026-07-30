import { Building2, CalendarDays, FileText, Landmark, Menu, ReceiptText, UsersRound } from "lucide-react";
import Link from "next/link";

import { ContextSelector } from "@/components/context-selector";
import { FiscalCalendar } from "@/components/fiscal-calendar";
import { MobileSearch } from "@/components/mobile-search";
import { NotificationMenu } from "@/components/notification-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const navItems = [{ label: "Resumen", href: "/", icon: Landmark }, { label: "Empresas", href: "#", icon: Building2 }, { label: "Calendario", href: "/calendario", icon: CalendarDays }, { label: "Operaciones", href: "#", icon: ReceiptText }, { label: "Documentos", href: "#", icon: FileText }, { label: "Equipo", href: "#", icon: UsersRound }];

export default function CalendarPage() {
  return <main className="min-h-screen bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100"><aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-200 bg-white px-4 py-5 dark:border-stone-800 dark:bg-stone-900 lg:flex"><div className="mb-10 flex items-center gap-3 px-2"><div className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white">PX</div><div><p className="font-semibold tracking-tight">proyectoxyz</p><p className="text-xs text-stone-500">Firma contable</p></div></div><nav className="space-y-1">{navItems.map(({ label, href, icon: Icon }) => <Link className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${label === "Calendario" ? "bg-[#e7f0e9] font-medium text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"}`} href={href} key={label}><Icon size={18} />{label}</Link>)}</nav><div className="mt-auto rounded-xl bg-[#14352d] p-4 text-white"><p className="text-xs font-medium text-emerald-100">JULIO 2026</p><p className="mt-2 text-sm leading-5 text-emerald-50">1 obligación vencida requiere atención inmediata.</p></div></aside><section className="lg:pl-64"><header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-stone-200 bg-[#f7f7f4]/90 px-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:px-5 lg:px-10"><div className="flex items-center gap-2 sm:gap-3"><Link className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white lg:hidden" href="/">PX</Link><ContextSelector mobile /><MobileSearch /><ContextSelector /></div><div className="flex items-center gap-1 sm:gap-3"><NotificationMenu /><div className="hidden sm:block"><ThemeToggle /></div><div className="hidden h-7 w-px bg-stone-200 sm:block dark:bg-stone-700" /><UserMenu /></div></header><FiscalCalendar /></section></main>;
}
