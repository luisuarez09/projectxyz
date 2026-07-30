"use client";

import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, FileUp, MoreHorizontal, Printer, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import Link from "next/link";

type TransactionKind = "purchase" | "sale";
type TransactionRecord = { id: number; date: string; document: string; party: string; rif: string; taxableBase: string; tax: string; total: string; status: "Registrada" | "Pendiente" };

const data: Record<TransactionKind, TransactionRecord[]> = {
  purchase: [
    { id: 1, date: "29 jul 2026", document: "F-001245", party: "Distribuidora Nacional de Empaques, C.A.", rif: "J-405699214", taxableBase: "Bs. 48.000,00", tax: "Bs. 7.680,00", total: "Bs. 55.680,00", status: "Registrada" },
    { id: 2, date: "28 jul 2026", document: "F-984512", party: "Insumos Occidente, C.A.", rif: "J-314889623", taxableBase: "Bs. 12.500,00", tax: "Bs. 2.000,00", total: "Bs. 14.500,00", status: "Pendiente" },
  ],
  sale: [
    { id: 1, date: "29 jul 2026", document: "F-000892", party: "Comercializadora San Miguel, C.A.", rif: "J-401256789", taxableBase: "Bs. 82.000,00", tax: "Bs. 13.120,00", total: "Bs. 95.120,00", status: "Registrada" },
    { id: 2, date: "28 jul 2026", document: "F-000891", party: "Alimentos La Montaña, C.A.", rif: "J-308774521", taxableBase: "Bs. 36.500,00", tax: "Bs. 5.840,00", total: "Bs. 42.340,00", status: "Registrada" },
  ],
};

export function TransactionDirectory({ kind }: { kind: TransactionKind }) {
  const isPurchase = kind === "purchase";
  const title = isPurchase ? "Compras" : "Ventas";
  const partyLabel = isPurchase ? "Proveedor" : "Cliente";
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<25 | 50 | "all">(25);
  const [menuOpen, setMenuOpen] = useState(false);
  const filtered = useMemo(() => data[kind].filter((item) => `${item.document} ${item.party} ${item.rif}`.toLowerCase().includes(query.toLowerCase())), [kind, query]);
  const pages = size === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages);
  const rows = size === "all" ? filtered : filtered.slice((currentPage - 1) * size, currentPage * size);
  const first = filtered.length ? size === "all" ? 1 : (currentPage - 1) * size + 1 : 0;
  const last = size === "all" ? filtered.length : Math.min(currentPage * size, filtered.length);

  return <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-stone-500">Empresa activa / Operaciones</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Consulta los documentos cargados de la empresa.</p></div>{isPurchase && <Link className="inline-flex h-9 items-center rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white hover:bg-[#0e2821]" href="/operaciones/compras/nueva">Registrar compra</Link>}</div><section className="mt-7 overflow-visible rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex flex-col gap-3 border-b border-stone-100 p-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-md"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} /><input className="field pl-9" onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={`Buscar por documento, ${partyLabel.toLowerCase()} o RIF...`} value={query} /></div><div className="flex items-center justify-end gap-3"><label className="flex items-center gap-2 text-xs text-stone-500">Mostrar <select className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-sm text-stone-700" onChange={(event) => { setSize(event.target.value === "all" ? "all" : Number(event.target.value) as 25 | 50); setPage(1); }} value={size}><option value="25">25</option><option value="50">50</option><option value="all">Todos</option></select></label><div className="relative"><Button aria-expanded={menuOpen} aria-label="Opciones de tabla" onClick={() => setMenuOpen((open) => !open)} size="icon-sm" variant="outline"><MoreHorizontal size={18} /></Button>{menuOpen && <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"><button className="menu-action" type="button"><FileUp size={16} /> Importar archivo</button><div className="my-1 border-t border-stone-100" /><button className="menu-action" type="button"><FileSpreadsheet size={16} /> Exportar Excel</button><button className="menu-action" type="button"><FileText size={16} /> Exportar CSV</button><button className="menu-action" onClick={() => window.print()} type="button"><FileText size={16} /> Exportar PDF</button><div className="my-1 border-t border-stone-100" /><button className="menu-action" onClick={() => window.print()} type="button"><Printer size={16} /> Imprimir</button></div>}</div></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1060px] text-left text-sm"><thead className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-900/50"><tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Documento</th><th className="px-5 py-3">{partyLabel}</th><th className="px-5 py-3 text-right">Base imponible</th><th className="px-5 py-3 text-right">IVA</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3">Estado</th></tr></thead><tbody className="divide-y divide-stone-100 dark:divide-stone-800">{rows.map((item) => <tr className="hover:bg-[#f4faf6] dark:hover:bg-emerald-950/10" key={item.id}><td className="px-5 py-4 text-stone-600 dark:text-stone-300">{item.date}</td><td className="px-5 py-4 font-medium">{item.document}</td><td className="px-5 py-4"><p className="font-medium">{item.party}</p><p className="mt-0.5 text-xs text-stone-500">{item.rif}</p></td><td className="px-5 py-4 text-right">{item.taxableBase}</td><td className="px-5 py-4 text-right">{item.tax}</td><td className="px-5 py-4 text-right font-medium">{item.total}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === "Registrada" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.status}</span></td></tr>)}{rows.length === 0 && <tr><td className="px-5 py-12 text-center text-stone-500" colSpan={7}>No se encontraron documentos.</td></tr>}</tbody></table></div><div className="flex flex-col gap-3 border-t border-stone-100 px-4 py-3 text-sm dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"><p className="text-stone-500">Mostrando {first}–{last} de {filtered.length} documentos</p><div className="flex items-center gap-2"><Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} size="sm" variant="outline"><ChevronLeft /> Anterior</Button><span className="min-w-20 text-center text-xs text-stone-500">Página {currentPage} de {pages}</span><Button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} size="sm" variant="outline">Siguiente <ChevronRight /></Button></div></div></section></div>;
}
