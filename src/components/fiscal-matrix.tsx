"use client";

import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  LoaderCircle,
  MonitorUp,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TvAutoRefresh } from "@/components/tv-auto-refresh";
import type { CalendarCaseView, CalendarView } from "@/modules/calendar/domain/calendar";

type CellStatus = "ok" | "soon" | "late" | "pending" | "na";
type MatrixCell = { status: CellStatus; label: string; date: string };

const completedStatuses = new Set(["SUBMITTED", "PAID", "CLOSED", "NOT_APPLICABLE"]);
const statusStyle: Record<CellStatus, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  soon: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  late: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
  pending: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  na: "border-stone-200 bg-stone-50 text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-500",
};

function currentPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find(({ type }) => type === "year")?.value}-${parts.find(({ type }) => type === "month")?.value}`;
}

function shortDate(value: string) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function cellFor(cases: CalendarCaseView[]): MatrixCell {
  if (!cases.length) return { status: "na", label: "No aplica", date: "—" };
  if (cases.some(({ deadlineStatus }) => deadlineStatus === "OVERDUE"))
    return { status: "late", label: "Vencida", date: shortDate(cases.find(({ deadlineStatus }) => deadlineStatus === "OVERDUE")?.dueDate ?? "") };
  if (cases.some(({ deadlineStatus }) => deadlineStatus === "DUE_SOON"))
    return { status: "soon", label: "Por vencer", date: shortDate(cases.find(({ deadlineStatus }) => deadlineStatus === "DUE_SOON")?.dueDate ?? "") };
  const complete = cases.filter(({ status }) => completedStatuses.has(status)).length;
  if (complete === cases.length)
    return { status: "ok", label: cases.length > 1 ? `${complete}/${cases.length} listas` : "Completada", date: shortDate(cases[0].dueDate) };
  return { status: "pending", label: cases.length > 1 ? `${complete}/${cases.length} listas` : "Pendiente", date: shortDate(cases.find(({ status }) => !completedStatuses.has(status))?.dueDate ?? "") };
}

export function FiscalMatrix({ tv = false, initialPeriod }: { tv?: boolean; initialPeriod?: string }) {
  const [period, setPeriod] = useState(() => initialPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(initialPeriod) ? initialPeriod : currentPeriod());
  const [data, setData] = useState<CalendarView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/calendar?period=${period}&companyId=all&view=due`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible cargar la matriz.");
      setData(body as CalendarView);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible cargar la matriz.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);
  const refreshQuietly = useCallback(() => load(true), [load]);

  const columns = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const item of data?.cases ?? [])
      if (!map.has(item.offeringId)) map.set(item.offeringId, { id: item.offeringId, name: item.offeringName });
    return [...map.values()].sort((left, right) => left.name.localeCompare(right.name, "es"));
  }, [data]);
  const rows = useMemo(() => (data?.companies ?? []).map((company) => ({
    company,
    cells: columns.map((column) => cellFor((data?.cases ?? []).filter((item) => item.companyId === company.id && item.offeringId === column.id))),
  })), [columns, data]);

  const companiesWithLate = rows.filter(({ cells }) => cells.some(({ status }) => status === "late")).length;
  const companiesWithSoon = rows.filter(({ cells }) => cells.some(({ status }) => status === "soon") && !cells.some(({ status }) => status === "late")).length;
  const companiesOnTrack = rows.filter(({ cells }) => cells.some(({ status }) => status !== "na") && cells.every(({ status }) => status === "ok" || status === "na")).length;
  const completed = (data?.cases ?? []).filter(({ status }) => completedStatuses.has(status)).length;
  const compliance = data?.cases.length ? Math.round((completed / data.cases.length) * 100) : 0;
  const incidents = (data?.cases ?? []).filter(({ deadlineStatus, status }) => deadlineStatus === "OVERDUE" || status === "INCIDENT").length;

  return (
    <main className={tv ? "min-h-screen bg-[#0d211b] text-white" : "min-h-screen bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100"}>
      <div className={tv ? "max-w-none px-8 py-7" : "mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10"}>
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            {!tv && <Link className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-[#14352d] hover:underline dark:text-emerald-300" href={`/calendario?period=${period}`}><ArrowLeft size={16} /> Volver al calendario</Link>}
            <p className={`text-sm ${tv ? "text-emerald-200" : "text-stone-500"}`}>Firma completa · <span className="capitalize">{data?.period.label ?? period}</span></p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Matriz consolidada de cumplimiento</h1>
            <p className={`mt-2 max-w-2xl text-sm ${tv ? "text-emerald-100" : "text-stone-600 dark:text-stone-300"}`}>Empresas y obligaciones obtenidas directamente de la configuración y sus expedientes guardados.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!tv && <div className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5 dark:border-stone-700 dark:bg-stone-900"><Button aria-label="Mes anterior" onClick={() => data && setPeriod(data.period.previous)} size="icon-sm" variant="ghost"><ChevronLeft /></Button><span className="min-w-36 px-2 text-center text-sm font-medium capitalize">{data?.period.label ?? period}</span><Button aria-label="Mes siguiente" onClick={() => data && setPeriod(data.period.next)} size="icon-sm" variant="ghost"><ChevronRight /></Button></div>}
            {!tv && <Link className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white hover:bg-[#0e2821]" href={`/calendario/matriz/tv?period=${period}`}><MonitorUp size={16} /> Modo TV</Link>}
            <span className={`rounded-lg px-3 py-2 text-sm font-medium ${tv ? "bg-rose-500/20 text-rose-100" : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>{incidents} incidencias activas</span>
          </div>
        </header>

        {error && <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${tv ? "border-rose-900 bg-rose-950/60 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{error}</div>}

        <div className={`mt-7 grid gap-3 ${tv ? "grid-cols-4" : "sm:grid-cols-4"}`}>
          <Summary label="Empresas al día" value={String(companiesOnTrack)} color="emerald" tv={tv} />
          <Summary label="Por vencer" value={String(companiesWithSoon)} color="amber" tv={tv} />
          <Summary label="Con vencidas" value={String(companiesWithLate)} color="rose" tv={tv} />
          <Summary label="Cumplimiento" value={`${compliance}%`} color="sky" tv={tv} />
        </div>

        <div className={`mt-6 flex flex-wrap items-center gap-4 text-xs font-medium ${tv ? "text-emerald-100" : "text-stone-600 dark:text-stone-300"}`}>
          <Legend color="bg-emerald-500" label="Completada" />
          <Legend color="bg-sky-500" label="Pendiente" />
          <Legend color="bg-amber-500" label="Por vencer" />
          <Legend color="bg-rose-500" label="Vencida" />
          <Legend color="bg-stone-300" label="No aplica" />
        </div>

        <section className={`mt-4 overflow-hidden rounded-xl border ${tv ? "border-emerald-900 bg-[#102a22]" : "border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"}`}>
          {loading ? <div className="flex min-h-80 items-center justify-center gap-2 text-sm"><LoaderCircle className="animate-spin" size={18} /> Cargando empresas y expedientes…</div> : rows.length ? <>
            <div className="hidden overflow-x-auto lg:block">
              <Table className="w-full min-w-max border-separate border-spacing-0 text-left">
                <TableHeader className={tv ? "bg-emerald-950/50" : "bg-stone-50 dark:bg-stone-800"}><TableRow><TableHead className="sticky left-0 z-10 min-w-72 px-4 py-3 text-xs font-semibold uppercase tracking-wide">Empresa</TableHead>{columns.map((column) => <TableHead className="min-w-32 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide" key={column.id}>{column.name}</TableHead>)}<TableHead className="min-w-28 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide">Riesgo</TableHead></TableRow></TableHeader>
                <TableBody>{rows.map(({ company, cells }) => <TableRow className={tv ? "border-t border-emerald-950" : "border-t border-stone-100 dark:border-stone-800"} key={company.id}><TableCell className={`sticky left-0 z-10 px-4 py-3 ${tv ? "bg-[#102a22]" : "bg-white dark:bg-stone-900"}`}><p className="text-sm font-semibold">{company.legalName}</p><p className={`mt-0.5 text-xs ${tv ? "text-emerald-200" : "text-stone-500"}`}>{company.activity} · {company.responsibleName}</p></TableCell>{cells.map((cell, index) => <TableCell className="px-1.5 py-2" key={`${company.id}-${columns[index].id}`}><MatrixMark cell={cell} /></TableCell>)}<TableCell className="px-3 py-2 text-center"><Risk cells={cells} /></TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
            <div className="grid gap-3 p-3 lg:hidden">{rows.map(({ company, cells }) => <article className={`rounded-lg border p-3 ${tv ? "border-emerald-900" : "border-stone-200 dark:border-stone-800"}`} key={company.id}><div className="flex items-start justify-between"><div><p className="text-sm font-semibold">{company.legalName}</p><p className={`mt-0.5 text-xs ${tv ? "text-emerald-200" : "text-stone-500"}`}>{company.activity}</p></div><Risk cells={cells} /></div><div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">{cells.map((cell, index) => <div key={columns[index].id}><p className="mb-1 truncate text-center text-[9px] font-medium">{columns[index].name}</p><MatrixMark cell={cell} /></div>)}</div></article>)}</div>
          </> : <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center"><p className="font-medium">No hay empresas disponibles</p><p className="mt-1 text-sm opacity-70">La matriz se llenará con las empresas registradas y autorizadas.</p></div>}
        </section>

        {tv && <div className="mt-5 flex flex-col items-center justify-center gap-2"><TvAutoRefresh onRefresh={refreshQuietly} /><Link className="text-sm text-emerald-200 underline underline-offset-4" href={`/calendario/matriz?period=${period}`}>Salir de modo TV</Link></div>}
      </div>
    </main>
  );
}

function MatrixMark({ cell }: { cell: MatrixCell }) { return <div className={`rounded-lg border px-2 py-2 text-center ${statusStyle[cell.status]}`}><p className="text-xs font-semibold">{cell.status === "ok" ? <Check className="mx-auto size-3.5" /> : cell.status === "late" ? <TriangleAlert className="mx-auto size-3.5" /> : cell.status === "soon" ? <Clock3 className="mx-auto size-3.5" /> : cell.status === "pending" ? <Circle className="mx-auto size-3.5" /> : "—"}</p><p className="mt-1 text-[10px] font-medium leading-none">{cell.date}</p><p className="mt-1 truncate text-[9px] opacity-80">{cell.label}</p></div>; }
function Legend({ color, label }: { color: string; label: string }) { return <span className="flex items-center gap-1.5"><i className={`size-2 rounded-full ${color}`} />{label}</span>; }
function Summary({ label, value, color, tv }: { label: string; value: string; color: "emerald" | "amber" | "rose" | "sky"; tv: boolean }) { const colors = { emerald: "text-emerald-500", amber: "text-amber-500", rose: "text-rose-500", sky: "text-sky-500" }; return <div className={`rounded-xl border p-4 ${tv ? "border-emerald-900 bg-[#102a22]" : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"}`}><p className={`text-xs ${tv ? "text-emerald-200" : "text-stone-500"}`}>{label}</p><p className={`mt-1 text-2xl font-semibold ${colors[color]}`}>{value}</p></div>; }
function Risk({ cells }: { cells: MatrixCell[] }) { const late = cells.filter(({ status }) => status === "late").length; const soon = cells.filter(({ status }) => status === "soon").length; const pending = cells.filter(({ status }) => status === "pending").length; return late ? <Badge className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300" variant="outline">{late} vencida{late > 1 ? "s" : ""}</Badge> : soon ? <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300" variant="outline">{soon} próxima{soon > 1 ? "s" : ""}</Badge> : pending ? <Badge className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300" variant="outline">{pending} pendiente{pending > 1 ? "s" : ""}</Badge> : <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" variant="outline">Al día</Badge>; }
