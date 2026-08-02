"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Building2, CheckCircle2, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useCompanyContext } from "@/components/company-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CompanyDetail } from "@/modules/companies/domain/company";

type SortKey = "legalName" | "activity" | "servicePlan" | "responsibleName" | "status";

export function CompaniesDirectory() {
  const router = useRouter();
  const { activeCompanyId, canManage, companies, error, loading, selectCompany } = useCompanyContext();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [plan, setPlan] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("legalName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | "all">(25);

  const plans = useMemo(() => [...new Set(companies.map(({ servicePlan }) => servicePlan).filter(Boolean))].sort(), [companies]);
  const filtered = useMemo(() => companies
    .filter((company) => `${company.legalName} ${company.rif} ${company.activity} ${company.responsibleName ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((company) => status === "ALL" || company.status === status)
    .filter((company) => plan === "ALL" || company.servicePlan === plan)
    .sort((left, right) => String(left[sortKey] ?? "").localeCompare(String(right[sortKey] ?? ""), "es") * (sortDirection === "asc" ? 1 : -1)),
  [companies, plan, query, sortDirection, sortKey, status]);
  const size = pageSize === "all" ? Math.max(filtered.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * size, currentPage * size);

  function sort(key: SortKey) {
    if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
  }

  async function configure(company: CompanyDetail) {
    await selectCompany(company.id);
    router.push("/configuracion/empresa");
  }

  return <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="mb-2 text-sm text-stone-500">Portafolio de la firma</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Empresas</h1><p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Datos persistidos, contexto activo y estructura operativa por empresa.</p></div>
      {canManage && <Link className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white hover:bg-[#0e2821]" href="/empresas/nueva"><Plus size={16} /> Nueva empresa</Link>}
    </header>
    {error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    <div className="mt-7 grid gap-4 sm:grid-cols-3">
      <Summary label="Empresas operativas" value={loading ? "—" : String(companies.filter(({ status: value }) => value === "ACTIVE").length)} detail="Registradas en PostgreSQL" />
      <Summary label="Empresa activa" value={activeCompanyId ? "1" : "0"} detail={activeCompanyId ? "Contexto seleccionado" : "Trabajando a nivel de firma"} />
      <Summary label="Sucursales" value={String(companies.reduce((total, company) => total + company.branchesCount, 0))} detail="Sedes activas registradas" />
    </div>
    <Card className="mt-6 border-0 shadow-sm"><CardContent className="p-4"><div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={17} /><Input className="field pl-9" onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por empresa, RIF, actividad o responsable..." value={query} /></div>
      <div className="flex flex-wrap gap-2"><SimpleSelect className="field w-auto" onChange={(event) => { setStatus(event.target.value); setPage(1); }} value={status}><option value="ALL">Todos los estados</option><option value="ACTIVE">Activas</option><option value="INACTIVE">Inactivas</option></SimpleSelect><SimpleSelect className="field w-auto" onChange={(event) => { setPlan(event.target.value); setPage(1); }} value={plan}><option value="ALL">Todos los planes</option>{plans.map((item) => <option key={item} value={item}>{item}</option>)}</SimpleSelect></div>
    </div></CardContent></Card>
    <Card className="mt-4 overflow-hidden border-0 shadow-sm"><Table className="min-w-[900px]"><TableHeader className="bg-stone-50/80 dark:bg-stone-900/60"><TableRow>
      <Head active={sortKey === "legalName"} direction={sortDirection} label="Empresa" onClick={() => sort("legalName")} /><Head active={sortKey === "activity"} direction={sortDirection} label="Actividad" onClick={() => sort("activity")} /><Head active={sortKey === "servicePlan"} direction={sortDirection} label="Plan" onClick={() => sort("servicePlan")} /><Head active={sortKey === "responsibleName"} direction={sortDirection} label="Responsable" onClick={() => sort("responsibleName")} /><TableHead>Sucursales</TableHead><Head active={sortKey === "status"} direction={sortDirection} label="Estado" onClick={() => sort("status")} />
    </TableRow></TableHeader><TableBody>{rows.map((company) => <TableRow
      aria-label={`Abrir configuración de ${company.legalName}`}
      className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
      key={company.id}
      onClick={() => void configure(company)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void configure(company);
        }
      }}
      role="link"
      tabIndex={0}
    >
      <TableCell><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800"><Building2 size={17} /></span><span><span className="flex items-center gap-2 font-semibold">{company.legalName}{company.id === activeCompanyId && <CheckCircle2 className="text-emerald-600" size={15} />}</span><span className="mt-0.5 block text-xs text-stone-500">{company.rif}</span></span></div></TableCell>
      <TableCell>{company.activity || "Sin registrar"}</TableCell><TableCell>{company.servicePlan || "Sin asignar"}</TableCell><TableCell>{company.responsibleName || "Sin asignar"}</TableCell><TableCell>{company.branchesCount}</TableCell><TableCell><Badge variant="outline" className={company.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-600"}>{company.status === "ACTIVE" ? "Activa" : "Inactiva"}</Badge></TableCell>
    </TableRow>)}{!loading && rows.length === 0 && <TableRow><TableCell className="py-12 text-center text-stone-500" colSpan={6}>No hay empresas que coincidan con los filtros.</TableCell></TableRow>}</TableBody></Table>
      <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3 text-stone-500"><span>{filtered.length} empresas</span><SimpleSelect className="h-8 w-auto" onChange={(event) => { setPageSize(event.target.value === "all" ? "all" : Number(event.target.value) as 25 | 50); setPage(1); }} value={pageSize}><option value="25">25</option><option value="50">50</option><option value="all">Todos</option></SimpleSelect></div><div className="flex items-center gap-2"><Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} size="sm" variant="outline"><ChevronLeft size={15} /> Anterior</Button><span className="text-xs text-stone-500">Página {currentPage} de {totalPages}</span><Button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} size="sm" variant="outline">Siguiente <ChevronRight size={15} /></Button></div></div>
    </Card>
  </main>;
}

function Head({ active, direction, label, onClick }: { active: boolean; direction: "asc" | "desc"; label: string; onClick: () => void }) { return <TableHead><button className="inline-flex items-center gap-1 hover:text-stone-900" onClick={onClick} type="button">{label}{active ? direction === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} /> : <ArrowUpDown size={14} />}</button></TableHead>; }
function Summary({ label, value, detail }: { label: string; value: string; detail: string }) { return <Card className="border-0 shadow-sm"><CardContent className="pt-4"><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></CardContent></Card>; }
