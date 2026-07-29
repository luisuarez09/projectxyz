"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { useDismissableMenu } from "@/hooks/use-dismissable-menu";

export function MobileSearch() {
  const { isOpen, ref, setIsOpen } = useDismissableMenu<HTMLDivElement>();
  const [query, setQuery] = useState("");
  return <div className="relative xl:hidden" ref={ref}><button aria-expanded={isOpen} aria-label="Buscar" className="grid size-9 place-items-center rounded-lg text-stone-500 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800" onClick={() => setIsOpen((open) => !open)} type="button"><Search size={19} /></button>{isOpen && <div className="fixed inset-x-3 top-16 z-40 rounded-xl border border-stone-200 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900"><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={17} /><input autoFocus className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 pl-10 pr-3 text-sm outline-none placeholder:text-stone-400 focus:border-[#14352d] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, tarea o documento..." value={query} /></div><p className="px-1 pt-3 text-xs text-stone-500 dark:text-stone-400">Busca en las empresas, obligaciones y documentos de la firma.</p></div>}</div>;
}
