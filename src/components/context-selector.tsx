"use client";

import { Building2, Check, ChevronDown, Landmark, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { useCompanyContext } from "@/components/company-context";
import { Input } from "@/components/ui/input";
import { useDismissableMenu } from "@/hooks/use-dismissable-menu";

export function ContextSelector({ mobile = false }: { mobile?: boolean }) {
  const { activeCompany, companies, loading, selecting, selectCompany } = useCompanyContext();
  const { isOpen, ref, setIsOpen } = useDismissableMenu<HTMLDivElement>();
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const visibleCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return companies.filter((company) => `${company.legalName} ${company.rif} ${company.activity}`.toLowerCase().includes(normalizedQuery));
  }, [companies, query]);

  async function choose(companyId: string | null) {
    await selectCompany(companyId);
    setQuery(""); setFocusedIndex(0); setIsOpen(false);
  }

  function handleKeyboard(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!visibleCompanies.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setFocusedIndex((index) => (index + 1) % visibleCompanies.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setFocusedIndex((index) => (index - 1 + visibleCompanies.length) % visibleCompanies.length); }
    if (event.key === "Enter") { event.preventDefault(); void choose(visibleCompanies[focusedIndex].id); }
  }

  return <div className={`relative ${mobile ? "lg:hidden" : "hidden lg:block"}`} ref={ref}>
    <button aria-expanded={isOpen} aria-label="Seleccionar empresa activa" className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 ${mobile ? "justify-center px-2" : "max-w-64 px-3"}`} disabled={loading || selecting} onClick={() => setIsOpen((open) => !open)} type="button"><Building2 size={16} className="shrink-0 text-[#14352d]" />{!mobile && <><span className="truncate">{loading ? "Cargando empresas…" : activeCompany?.legalName ?? "Firma completa"}</span><ChevronDown size={15} className="shrink-0 text-stone-400" /></>}</button>
    {isOpen && <div className={`${mobile ? "fixed inset-x-3 top-16" : "absolute left-0 top-11 w-88"} z-40 rounded-xl border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-700 dark:bg-stone-900`}>
      <p className="px-2 py-1.5 text-xs font-medium text-stone-500">Contexto de trabajo</p>
      <button className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${!activeCompany ? "bg-[#e7f0e9]" : "hover:bg-stone-100"}`} onClick={() => void choose(null)} type="button"><Landmark size={17} className="text-[#14352d]" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#14352d]">Firma completa</span><span className="block text-xs text-stone-500">Sin empresa activa</span></span>{!activeCompany && <Check className="text-emerald-700" size={16} />}</button>
      <div className="relative my-2"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={15} /><Input aria-label="Buscar empresa" className="h-9 w-full bg-stone-50 pl-9" onChange={(event) => { setQuery(event.target.value); setFocusedIndex(0); }} onKeyDown={handleKeyboard} placeholder="Buscar empresa..." value={query} /></div>
      <div className="max-h-60 overflow-y-auto" role="listbox" aria-label="Empresas disponibles">{visibleCompanies.map((company, index) => <button aria-selected={company.id === activeCompany?.id} className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${company.id === activeCompany?.id ? "bg-[#e7f0e9]" : focusedIndex === index ? "bg-stone-100" : "hover:bg-stone-100"}`} key={company.id} onClick={() => void choose(company.id)} role="option" type="button"><Building2 size={17} className="text-stone-500" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{company.legalName}</span><span className="block truncate text-xs text-stone-500">{company.rif}{company.activity ? ` · ${company.activity}` : ""}</span></span>{company.id === activeCompany?.id && <Check className="text-emerald-700" size={16} />}</button>)}{visibleCompanies.length === 0 && <p className="px-3 py-4 text-center text-sm text-stone-500">No se encontraron empresas.</p>}</div>
    </div>}
  </div>;
}
