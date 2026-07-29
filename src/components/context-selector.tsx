"use client";

import { Building2, ChevronDown, Landmark, Search } from "lucide-react";
import { useMemo, useState } from "react";

const companies = [
  { name: "Distribuidora El Roble, C.A.", business: "Distribución de alimentos" },
  { name: "Inversiones Costa Azul, C.A.", business: "Servicios inmobiliarios" },
  { name: "Servicios Maracay, C.A.", business: "Servicios profesionales" },
];

export function ContextSelector() {
  const [query, setQuery] = useState("");
  const visibleCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return companies.filter((company) => `${company.name} ${company.business}`.toLowerCase().includes(normalizedQuery));
  }, [query]);

  return (
    <details className="relative hidden lg:block">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800 [&::-webkit-details-marker]:hidden">
        <Building2 size={16} className="text-[#14352d] dark:text-emerald-300" /> Firma completa <ChevronDown size={15} className="text-stone-400" />
      </summary>
      <div className="absolute left-0 top-11 z-30 w-88 rounded-xl border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-700 dark:bg-stone-900">
        <p className="px-2 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">Contexto de trabajo</p>
        <button className="flex w-full items-center gap-3 rounded-lg bg-[#e7f0e9] px-3 py-2.5 text-left dark:bg-emerald-950" type="button">
          <Landmark size={17} className="text-[#14352d] dark:text-emerald-300" />
          <span><span className="block text-sm font-medium text-[#14352d] dark:text-emerald-100">Firma completa</span><span className="block text-xs text-emerald-800 dark:text-emerald-300">Todas las empresas y tareas</span></span>
        </button>
        <div className="relative my-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={15} />
          <input aria-label="Buscar empresa" className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-3 text-sm outline-none placeholder:text-stone-400 focus:border-[#14352d] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa..." value={query} />
        </div>
        <div className="max-h-57 overflow-y-auto">
          {visibleCompanies.map((company) => (
            <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800" key={company.name} type="button">
              <Building2 size={17} className="text-stone-500" />
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{company.name}</span><span className="block truncate text-xs text-stone-500 dark:text-stone-400">{company.business}</span></span>
            </button>
          ))}
          {visibleCompanies.length === 0 && <p className="px-3 py-4 text-center text-sm text-stone-500">No se encontraron empresas.</p>}
        </div>
      </div>
    </details>
  );
}
