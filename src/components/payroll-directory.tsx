"use client";

import { CalendarDays, ChevronRight, CircleDollarSign, Plus, Search, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PayrollWorkspace } from "@/components/payroll-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/lib/employees-demo";
import { getPayrollTotals, payrollPeriods } from "@/lib/payroll-demo";

export function PayrollDirectory() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todas");
  const [preparing, setPreparing] = useState(false);

  const rows = useMemo(() => payrollPeriods.filter((period) => {
    const matchesQuery = period.label.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (status === "Todas" || period.status === status);
  }), [query, status]);

  const current = payrollPeriods[0];
  const currentTotals = getPayrollTotals(current);
  const lastClosed = payrollPeriods.find((period) => period.status === "Cerrada");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Empresa activa / Empleados</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nóminas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Consulta cada mes, revisa sus quincenas y conserva los recibos de pago de los trabajadores.</p>
        </div>
        <Button className="h-9 bg-[#14352d] hover:bg-[#0e2821]" onClick={() => setPreparing(true)}><Plus /> Preparar nómina</Button>
      </header>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={CalendarDays} label="Período abierto" value={current.label} detail={`${current.cuts.filter((cut) => cut.status === "Pagada").length} de ${current.cuts.length} quincenas pagadas`} />
        <Summary icon={CircleDollarSign} label="Total estimado del mes" value={money(currentTotals.total)} detail={`${money(currentTotals.pending)} pendiente`} />
        <Summary icon={UsersRound} label="Trabajadores incluidos" value={String(currentTotals.employeeCount)} detail="Personal activo del período" />
        <Summary icon={CalendarDays} label="Último cierre" value={lastClosed?.label ?? "Sin cierres"} detail="Nómina mensual consolidada" />
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} /><Input className="field pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar mes o año..." value={query} /></div>
          <SimpleSelect aria-label="Filtrar nóminas por estado" className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-sm dark:border-stone-700 dark:bg-stone-800" onChange={(event) => setStatus(event.target.value)} value={status}><option>Todas</option><option>Abierta</option><option>Cerrada</option></SimpleSelect>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-900/50"><TableRow><TableHead className="px-5 py-3">Período</TableHead><TableHead className="px-5 py-3">Frecuencia aplicada</TableHead><TableHead className="px-5 py-3">Pagos del mes</TableHead><TableHead className="px-5 py-3">Trabajadores</TableHead><TableHead className="px-5 py-3 text-right">Total nómina</TableHead><TableHead className="px-5 py-3">Estado</TableHead><TableHead className="px-5 py-3 text-right">Consulta</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((period) => {
              const totals = getPayrollTotals(period);
              const paidCuts = period.cuts.filter((cut) => cut.status === "Pagada").length;
              return <TableRow className="cursor-pointer hover:bg-[#f4faf6] dark:hover:bg-emerald-950/10" key={period.id} onClick={() => router.push(`/empleados/nomina/${period.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") router.push(`/empleados/nomina/${period.id}`); }} role="link" tabIndex={0}>
                <TableCell className="px-5 py-4"><Link className="font-semibold text-[#14352d] hover:underline dark:text-emerald-300" href={`/empleados/nomina/${period.id}`}>{period.label}</Link><p className="mt-1 text-xs text-stone-500">Conversión y parámetros conservados en el período</p></TableCell>
                <TableCell className="px-5 py-4"><p className="font-medium">{period.frequency}</p><p className="mt-1 text-xs text-stone-500">Definida en Configuración Laboral</p></TableCell>
                <TableCell className="px-5 py-4"><p className="font-medium">{paidCuts} de {period.cuts.length} procesados</p><p className="mt-1 text-xs text-stone-500">{period.cuts.map((cut) => cut.label).join(" · ")}</p></TableCell>
                <TableCell className="px-5 py-4 tabular-nums">{totals.employeeCount}</TableCell>
                <TableCell className="px-5 py-4 text-right font-semibold tabular-nums">{money(totals.total)}</TableCell>
                <TableCell className="px-5 py-4"><StatusBadge status={period.status} /></TableCell>
                <TableCell className="px-5 py-4 text-right"><Link className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[0.8rem] font-medium hover:bg-stone-100 dark:hover:bg-stone-800" href={`/empleados/nomina/${period.id}`}>Ver detalle <ChevronRight size={14} /></Link></TableCell>
              </TableRow>;
            })}{rows.length === 0 && <TableRow><TableCell className="px-5 py-12 text-center text-stone-500" colSpan={7}>No se encontraron nóminas para este filtro.</TableCell></TableRow>}</TableBody>
          </Table>
        </div>
        <div className="border-t border-stone-100 px-5 py-3 text-sm text-stone-500 dark:border-stone-800">{rows.length} períodos encontrados</div>
      </section>

      {preparing && <div aria-modal="true" className="fixed inset-0 z-50 bg-stone-950/45 p-2 sm:p-4" role="dialog"><section className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-stone-50 shadow-2xl dark:bg-stone-950"><header className="flex items-start justify-between border-b border-stone-200 bg-white px-5 py-4 dark:border-stone-800 dark:bg-stone-900"><div><h2 className="font-semibold">Preparar nómina</h2><p className="mt-1 text-sm text-stone-500">Los parámetros laborales se cargan desde la configuración de la empresa.</p></div><Button aria-label="Cerrar preparación de nómina" onClick={() => setPreparing(false)} size="icon-sm" variant="ghost"><X /></Button></header><div className="min-h-0 flex-1 overflow-y-auto"><PayrollWorkspace /></div></section></div>}
    </main>
  );
}

function Summary({ icon: Icon, label, value, detail }: { icon: typeof CalendarDays; label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div><span className="grid size-9 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><Icon size={18} /></span></div></div>;
}

function StatusBadge({ status }: { status: "Abierta" | "Cerrada" }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status === "Cerrada" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{status}</span>;
}
