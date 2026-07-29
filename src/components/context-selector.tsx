"use client";

import { Building2, ChevronDown, Landmark, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { useDismissableMenu } from "@/hooks/use-dismissable-menu";

const companies = [
  { name: "Distribuidora El Roble, C.A.", business: "Distribución de alimentos" },
  { name: "Inversiones Costa Azul, C.A.", business: "Servicios inmobiliarios" },
  { name: "Servicios Maracay, C.A.", business: "Servicios profesionales" },
];

export function ContextSelector() {
  const { isOpen, ref, setIsOpen } = useDismissableMenu<HTMLDivElement>();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("Firma completa");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const visibleCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return companies.filter((company) => `${company.name} ${company.business}`.toLowerCase().includes(normalizedQuery));
  }, [query]);

  function selectCompany(name: string) {
    setSelected(name);
    setQuery("");
    setFocusedIndex(0);
    setIsOpen(false);
  }

  function handleKeyboard(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!visibleCompanies.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setFocusedIndex((index) => (index + 1) % visibleCompanies.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setFocusedIndex((index) => (index - 1 + visibleCompanies.length) % visibleCompanies.length); }
    if (event.key === "Enter") { event.preventDefault(); selectCompany(visibleCompanies[focusedIndex].name); }
  }

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button aria-expanded={isOpen} className="flex h-9 max-w-55 cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800" onClick={() => setIsOpen((open) => !open)} type="button">
        <Building2 size={16} className="shrink-0 text-[#14352d] dark:text-emerald-300" /> <span className="truncate">{selected}</span><ChevronDown size={15} className="shrink-0 text-stone-400" />
      </button>
      {isOpen && <div className="absolute left-0 top-11 z-30 w-88 rounded-xl border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-700 dark:bg-stone-900">
        <p className="px-2 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">Contexto de trabajo</p>
        <button className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${selected === "Firma completa" ? "bg-[#e7f0e9] dark:bg-emerald-950" : "hover:bg-stone-100 dark:hover:bg-stone-800"}`} onClick={() => selectCompany("Firma completa")} type="button">
          <Landmark size={17} className="text-[#14352d] dark:text-emerald-300" /><span><span className="block text-sm font-medium text-[#14352d] dark:text-emerald-100">Firma completa</span><span className="block text-xs text-emerald-800 dark:text-emerald-300">Todas las empresas y tareas</span></span>
        </button>
        <div className="relative my-2"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={15} /><input aria-label="Buscar empresa" className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-3 text-sm outline-none placeholder:text-stone-400 focus:border-[#14352d] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" onChange={(event) => { setQuery(event.target.value); setFocusedIndex(0); }} onKeyDown={handleKeyboard} placeholder="Buscar empresa..." value={query} /></div>
        <div className="max-h-57 overflow-y-auto" role="listbox" aria-label="Resultados de empresas">
          {visibleCompanies.map((company, index) => <button aria-selected={focusedIndex === index} className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${focusedIndex === index ? "bg-stone-100 dark:bg-stone-800" : "hover:bg-stone-100 dark:hover:bg-stone-800"}`} key={company.name} onClick={() => selectCompany(company.name)} role="option" type="button"><Building2 size={17} className="text-stone-500" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{company.name}</span><span className="block truncate text-xs text-stone-500 dark:text-stone-400">{company.business}</span></span></button>)}
          {visibleCompanies.length === 0 && <p className="px-3 py-4 text-center text-sm text-stone-500">No se encontraron empresas.</p>}
        </div>
        <p className="px-2 pb-1 pt-2 text-[11px] text-stone-400">↑ ↓ para navegar · Enter para seleccionar</p>
      </div>}
    </div>
  );
}
