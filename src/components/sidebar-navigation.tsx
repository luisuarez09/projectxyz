"use client";

import { Archive, BookOpenCheck, Building2, CalendarDays, ChevronDown, Landmark, ReceiptText, Settings2, UsersRound, WalletCards } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type ActiveSection = "Resumen" | "Empresas" | "Calendario" | "Archivo" | "Equipo" | "Operaciones";

const primaryItems = [
  { label: "Resumen", href: "/", icon: Landmark },
  { label: "Empresas", href: "/empresas", icon: Building2 },
  { label: "Calendario", href: "/calendario", icon: CalendarDays },
  { label: "Archivo", href: "/archivo", icon: Archive },
  { label: "Equipo", href: "#", icon: UsersRound },
];

export function SidebarNavigation({ active }: { active: ActiveSection }) {
  const [operationsOpen, setOperationsOpen] = useState(active === "Operaciones");
  const [settingsOpen, setSettingsOpen] = useState(false);

  return <nav className="space-y-1" aria-label="Navegación principal">
    {primaryItems.map(({ label, href, icon: Icon }) => {
      const isActive = active === label;
      return <Link className={navClass(isActive)} href={href} key={label}><Icon size={18} strokeWidth={isActive ? 2.25 : 1.8} />{label}</Link>;
    })}
    <div className="my-5 border-t border-stone-200 pt-4 dark:border-stone-800">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">Empresa activa</p>
      <p className="truncate px-3 pb-2 text-xs font-medium text-[#14352d] dark:text-emerald-200">Distribuidora El Roble, C.A.</p>
      <Link className={navClass(false)} href="/declaraciones"><FileTextIcon /><span className="flex-1">Declaraciones</span></Link>
      <Link className={navClass(false)} href="/servicios"><WalletCards size={18} /><span className="flex-1">Servicios</span></Link>
      <Link className={navClass(false)} href="/compromisos-de-pago"><Landmark size={18} /><span className="flex-1">Compromisos de pago</span></Link>
      <button aria-expanded={operationsOpen} className={navClass(active === "Operaciones")} onClick={() => setOperationsOpen((open) => !open)} type="button"><ReceiptText size={18} /><span className="flex-1 text-left">Operaciones</span><ChevronDown className={`transition-transform ${operationsOpen ? "rotate-180" : ""}`} size={15} /></button>
      {operationsOpen && <div className="ml-5 mt-1 space-y-0.5 border-l border-stone-200 pl-3 dark:border-stone-700"><SubItem href="/operaciones" label="Vista general" /><SubItem href="/operaciones/clientes" label="Clientes" /><SubItem href="/operaciones/proveedores" label="Proveedores" /><SubItem href="/operaciones/compras" label="Compras" /><SubItem href="/operaciones/ventas" label="Ventas" /><SubItem href="#" label="Retenciones" /></div>}
      <Link className={navClass(false)} href="#"><WalletCards size={18} /><span className="flex-1">Personal y nómina</span><span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500 dark:bg-stone-800">Próx.</span></Link>
      <button aria-expanded={settingsOpen} className={navClass(false)} onClick={() => setSettingsOpen((open) => !open)} type="button"><Settings2 size={18} /><span className="flex-1 text-left">Configuración</span><ChevronDown className={`transition-transform ${settingsOpen ? "rotate-180" : ""}`} size={15} /></button>
      {settingsOpen && <div className="ml-5 mt-1 space-y-0.5 border-l border-stone-200 pl-3 dark:border-stone-700"><SubItem href="/configuracion/empresa" label="Empresa y cobertura" /><SubItem href="#" label="Plan de cuentas" icon={<BookOpenCheck size={14} />} /></div>}
    </div>
  </nav>;
}

function FileTextIcon() { return <ReceiptText size={18} />; }

function SubItem({ href, label, icon }: { href: string; label: string; icon?: ReactNode }) {
  return <Link className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100" href={href}>{icon}{label}</Link>;
}

function navClass(active: boolean) {
  return `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? "bg-[#e7f0e9] font-medium text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"}`;
}
