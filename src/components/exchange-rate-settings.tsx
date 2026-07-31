"use client";;
import { CalendarRange, FileSpreadsheet, Landmark, Search, Wifi } from "lucide-react";
import { useMemo, useState } from "react";

import { DatePicker } from "@/components/ui/date-picker";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

type Currency = "USD" | "EUR";
type Rate = { id: string; currency: Currency; rate: number; date: string; source: string };
type DateRange = { from: string; to: string };

const initialRates: Rate[] = [
  { id: "eur-30", currency: "EUR", rate: 832.25, date: "2026-06-30", source: "Referencia demostrativa" },
  { id: "eur-29", currency: "EUR", rate: 828.91, date: "2026-06-29", source: "Referencia demostrativa" },
  { id: "eur-26", currency: "EUR", rate: 824.30, date: "2026-06-26", source: "Referencia demostrativa" },
  { id: "usd-30", currency: "USD", rate: 0, date: "2026-06-30", source: "Pendiente de sincronización" },
  { id: "usd-29", currency: "USD", rate: 0, date: "2026-06-29", source: "Pendiente de sincronización" },
];

const initialRange = { from: "2026-06-26", to: "2026-06-30" };
const money = new Intl.NumberFormat("es-VE", { style: "currency", currency: "VES", minimumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("es-VE");

export function ExchangeRateSettings() {
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [draftRange, setDraftRange] = useState<DateRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<DateRange>(initialRange);
  const [message, setMessage] = useState("");

  const visible = useMemo(() => initialRates
    .filter((rate) => rate.currency === currency && rate.date >= appliedRange.from && rate.date <= appliedRange.to)
    .sort((a, b) => b.date.localeCompare(a.date)), [appliedRange, currency]);

  const consult = () => {
    if (!draftRange.from || !draftRange.to) { setMessage("Selecciona las fechas desde y hasta."); return; }
    if (draftRange.from > draftRange.to) { setMessage("La fecha «Desde» no puede ser posterior a «Hasta»."); return; }
    setAppliedRange(draftRange);
    setMessage("");
  };

  const exportExcel = () => {
    if (!visible.length) return;
    const rows = visible.map((rate, index) => [String(index + 1), formatDate(rate.date), rate.rate ? rate.rate.toFixed(2) : "Pendiente"]);
    const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr><th>Nro.</th><th>Fecha</th><th>Monto</th></tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tasas-${currency.toLowerCase()}-${appliedRange.from}-${appliedRange.to}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Configuración de la firma</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tasas de cambio</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Consulta el histórico por rango de fechas y exporta el resultado a Excel con número, fecha y monto.</p>
        </div>
        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800" onClick={() => setMessage("La conexión BCV aún no está configurada. No se agregaron tasas automáticamente.")} type="button"><Wifi size={16} /> Sincronizar BCV</button>
      </div>
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf4ef] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><CalendarRange size={18} /></span><div><h2 className="font-semibold">Consultar histórico</h2><p className="mt-1 text-sm text-stone-500">El rango se aplica a la moneda seleccionada.</p></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[180px_minmax(150px,1fr)_minmax(150px,1fr)_auto] lg:items-end">
          <label className="field-label">Moneda<SimpleSelect className="field mt-1.5" onChange={(event) => { setCurrency(event.target.value as Currency); setMessage(""); }} value={currency}><option value="USD">Dólar · USD</option><option value="EUR">Euro · EUR</option></SimpleSelect></label>
          <label className="field-label">Desde<DatePicker
            className="field mt-1.5"
            onChange={(event) => setDraftRange((range) => ({ ...range, from: event.target.value }))}
            value={draftRange.from} /></label>
          <label className="field-label">Hasta<DatePicker
            className="field mt-1.5"
            onChange={(event) => setDraftRange((range) => ({ ...range, to: event.target.value }))}
            value={draftRange.to} /></label>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-4 text-sm font-medium text-white hover:bg-[#0e2821] sm:col-span-2 lg:col-span-1" onClick={consult} type="button"><Search size={16} /> Consultar</button>
        </div>
        {message && <p aria-live="polite" className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-300">{message}</p>}
      </section>
      <section className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">Resultado de la consulta</h2><p className="mt-1 text-sm text-stone-500">{visible.length} registros · {currency} · {formatDate(appliedRange.from)} al {formatDate(appliedRange.to)}</p></div>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800" disabled={!visible.length} onClick={exportExcel} type="button"><FileSpreadsheet size={16} /> Exportar Excel</button>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[560px] w-full text-left text-sm">
            <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="w-28 px-5 py-3">Nro.</TableHead><TableHead className="px-3 py-3">Fecha</TableHead><TableHead className="px-5 py-3 text-right">Monto</TableHead></TableRow></TableHeader>
            <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
              {visible.map((rate, index) => <TableRow key={rate.id}><TableCell className="px-5 py-4 text-stone-500">{index + 1}</TableCell><TableCell className="px-3 py-4 font-medium">{formatDate(rate.date)}</TableCell><TableCell className="px-5 py-4 text-right font-semibold tabular-nums">{rate.rate ? money.format(rate.rate) : "Pendiente"}</TableCell></TableRow>)}
              {!visible.length && <TableRow><TableCell className="px-5 py-12 text-center text-stone-500" colSpan={3}>No hay tasas registradas para el rango seleccionado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>
      <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
        <div className="flex gap-3"><Landmark className="mt-0.5 shrink-0" size={18} /><div><p className="font-semibold">Integración y datos oficiales pendientes</p><p className="mt-1 leading-5">Los montos visibles son demostrativos. La consulta oficial, la persistencia histórica y la trazabilidad de la fuente se activarán al conectar el servicio y el backend.</p></div></div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return value ? dateFormatter.format(new Date(`${value}T00:00:00`)) : "Sin fecha";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
