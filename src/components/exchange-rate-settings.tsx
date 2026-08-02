"use client";

import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  FileSpreadsheet,
  Landmark,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { DatePicker } from "@/components/ui/date-picker";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Currency = string;
type SourceKind = "BCV" | "MANUAL";
type CurrencyDefinition = {
  code: string;
  name: string;
  symbol: string | null;
  source: "BCV" | "MANUAL" | "EXTERNAL";
  sourceName: string | null;
  sourceUrl: string | null;
  automaticEnabled: boolean;
};
type Automation = { timezone: string; startsAt: string; endsAt: string; intervalMinutes: number };
type Rate = {
  id: string;
  currency: Currency;
  rate: string;
  effectiveDate: string;
  sourceKind: SourceKind;
  sourceUrl: string | null;
  sourcePublishedAt: string | null;
  capturedAt: string;
  manualReason: string | null;
  recordedBy: { name: string; email: string } | null;
};
type SyncRun = {
  id: string;
  trigger: "AUTOMATIC" | "MANUAL";
  status: "SUCCEEDED" | "NO_CHANGE" | "FAILED";
  effectiveDate: string | null;
  ratesFound: number;
  errorMessage: string | null;
  startedAt: string;
};
type DateRange = { from: string; to: string };

const dateFormatter = new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFormatter = new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Caracas" });
const shortDateFormatter = new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", timeZone: "UTC" });
const rateFormatter = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
const pageSize = 10;

function isoOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const initialRange = { from: isoOffset(-30), to: isoOffset(7) };

export function ExchangeRateSettings() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyDefinition[]>([]);
  const [automation, setAutomation] = useState<Automation>({ timezone: "America/Caracas", startsAt: "18:00", endsAt: "21:00", intervalMinutes: 30 });
  const [currency, setCurrency] = useState<Currency>("USD");
  const [source, setSource] = useState<"ALL" | SourceKind>("ALL");
  const [draftRange, setDraftRange] = useState<DateRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<DateRange>(initialRange);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const load = useCallback(async (range: DateRange) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(range);
      const response = await fetch(`/api/firm/exchange-rates?${params}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible cargar las tasas.");
      setRates(body.rates);
      setRuns(body.runs);
      setCurrencies(body.currencies);
      setAutomation(body.automation);
      setCurrency((current) => body.currencies.some((item: CurrencyDefinition) => item.code === current)
        ? current
        : body.currencies[0]?.code ?? "USD");
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No fue posible cargar las tasas." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(appliedRange); }, [appliedRange, load]);

  const filtered = useMemo(() => rates.filter((rate) =>
    rate.currency === currency && (source === "ALL" || rate.sourceKind === source),
  ), [currency, rates, source]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [currency, source, appliedRange]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);

  const chartData = useMemo(() => {
    return rates
      .filter((rate) => rate.currency === currency)
      .map((rate) => ({ date: rate.effectiveDate, rate: Number(rate.rate) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [currency, rates]);
  const selectedCurrency = currencies.find((item) => item.code === currency);
  const chartConfig = useMemo(() => ({
    rate: { label: selectedCurrency ? `${selectedCurrency.name} · ${selectedCurrency.code}` : currency, color: "#2f715f" },
  } satisfies ChartConfig), [currency, selectedCurrency]);

  const sync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/firm/exchange-rates/sync", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible consultar el BCV.");
      setMessage({
        tone: "success",
        text: body.inserted
          ? `BCV consultado: ${body.inserted} tasas guardadas con fecha valor ${formatDate(body.effectiveDate)}.`
          : `La consulta terminó correctamente. Las tasas del ${formatDate(body.effectiveDate)} ya estaban registradas.`,
      });
      await load(appliedRange);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No fue posible consultar el BCV." });
      await load(appliedRange);
    } finally {
      setSyncing(false);
    }
  };

  const consult = () => {
    if (!draftRange.from || !draftRange.to) return setMessage({ tone: "error", text: "Selecciona las fechas desde y hasta." });
    if (draftRange.from > draftRange.to) return setMessage({ tone: "error", text: "La fecha desde no puede ser posterior a la fecha hasta." });
    setMessage(null);
    setAppliedRange(draftRange);
  };

  const exportExcel = () => {
    if (!filtered.length) return;
    const rows = filtered.map((rate, index) => [String(index + 1), formatDate(rate.effectiveDate), rate.rate]);
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
      <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-stone-500">Configuración de la firma</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tasas de cambio</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Tasas oficiales publicadas por el BCV y registros manuales trazables para operaciones en moneda extranjera.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800" disabled={!currencies.length} onClick={() => setManualOpen(true)} type="button"><Plus size={16} /> Registrar manual</button>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white hover:bg-[#0e2821] disabled:opacity-60" disabled={syncing} onClick={sync} type="button">{syncing ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />} Consultar BCV ahora</button>
        </div>
      </header>

      {message && <Notice message={message} />}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {currencies.map((definition) => <RateCard definition={definition} key={definition.code} rate={rates.find((rate) => rate.currency === definition.code)} loading={loading} />)}
        <AutomationCard automation={automation} runs={runs} />
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="font-semibold">Evolución registrada</h2><p className="mt-1 text-sm text-stone-500">{selectedCurrency ? `${selectedCurrency.name} (${selectedCurrency.code})` : currency} expresada en bolívares por unidad.</p></div>
          {selectedCurrency?.sourceUrl && <a className="inline-flex items-center gap-1 text-sm font-medium text-[#2f715f] hover:underline dark:text-emerald-300" href={selectedCurrency.sourceUrl} rel="noreferrer" target="_blank">Abrir fuente {selectedCurrency.sourceName ?? selectedCurrency.code} <ExternalLink size={14} /></a>}
        </div>
        {chartData.length ? (
          <ChartContainer className="mt-5 h-[300px] w-full" config={chartConfig} initialDimension={{ width: 720, height: 300 }}>
            <LineChart accessibilityLayer data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis axisLine={false} dataKey="date" minTickGap={24} tickFormatter={formatShortDate} tickLine={false} tickMargin={10} />
              <YAxis axisLine={false} domain={["auto", "auto"]} tickFormatter={(value) => `Bs ${Number(value).toFixed(0)}`} tickLine={false} width={68} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => formatDate(String(payload?.[0]?.payload?.date ?? ""))} />} cursor={false} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line dataKey="rate" dot={{ fill: "var(--color-rate)", r: 3 }} stroke="var(--color-rate)" strokeWidth={2.5} type="monotone" />
            </LineChart>
          </ChartContainer>
        ) : <div className="grid h-56 place-items-center text-center text-sm text-stone-500">{loading ? <LoaderCircle className="animate-spin" /> : "Aún no hay tasas persistidas en este rango."}</div>}
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf4ef] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><Search size={18} /></span><div><h2 className="font-semibold">Consultar histórico</h2><p className="mt-1 text-sm text-stone-500">Filtra por moneda, origen y fecha valor.</p></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-[150px_150px_minmax(150px,1fr)_minmax(150px,1fr)_auto] xl:items-end">
          <label className="field-label">Moneda<SimpleSelect className="field mt-1.5" onChange={(event) => setCurrency(event.target.value)} value={currency}>{currencies.map((item) => <option key={item.code} value={item.code}>{item.name} · {item.code}</option>)}</SimpleSelect></label>
          <label className="field-label">Origen<SimpleSelect className="field mt-1.5" onChange={(event) => setSource(event.target.value as "ALL" | SourceKind)} value={source}><option value="ALL">Todos</option><option value="BCV">BCV oficial</option><option value="MANUAL">Manual</option></SimpleSelect></label>
          <label className="field-label">Desde<DatePicker className="field mt-1.5" onChange={(event) => setDraftRange((range) => ({ ...range, from: event.target.value }))} value={draftRange.from} /></label>
          <label className="field-label">Hasta<DatePicker className="field mt-1.5" onChange={(event) => setDraftRange((range) => ({ ...range, to: event.target.value }))} value={draftRange.to} /></label>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-4 text-sm font-medium text-white hover:bg-[#0e2821] sm:col-span-2 xl:col-span-1" onClick={consult} type="button"><Search size={16} /> Consultar</button>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">Tasas registradas</h2><p className="mt-1 text-sm text-stone-500">{filtered.length} registros · {currency} · {formatDate(appliedRange.from)} al {formatDate(appliedRange.to)}</p></div>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900" disabled={!filtered.length} onClick={exportExcel} type="button"><FileSpreadsheet size={16} /> Exportar Excel</button>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[780px] w-full text-left text-sm">
            <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="w-20 px-5 py-3">Nro.</TableHead><TableHead className="px-3 py-3">Fecha valor</TableHead><TableHead className="px-3 py-3 text-right">Monto</TableHead><TableHead className="px-3 py-3">Origen</TableHead><TableHead className="px-5 py-3">Registro</TableHead></TableRow></TableHeader>
            <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
              {visible.map((rate, index) => <TableRow key={rate.id}><TableCell className="px-5 py-4 text-stone-500">{(page - 1) * pageSize + index + 1}</TableCell><TableCell className="px-3 py-4 font-medium">{formatDate(rate.effectiveDate)}</TableCell><TableCell className="px-3 py-4 text-right font-semibold tabular-nums">Bs {formatRate(rate.rate)}</TableCell><TableCell className="px-3 py-4"><SourceBadge rate={rate} /></TableCell><TableCell className="px-5 py-4 text-xs text-stone-500"><p>{dateTimeFormatter.format(new Date(rate.capturedAt))}</p>{rate.recordedBy && <p className="mt-1">Por {rate.recordedBy.name}</p>}</TableCell></TableRow>)}
              {!loading && !visible.length && <TableRow><TableCell className="px-5 py-12 text-center text-stone-500" colSpan={5}>No hay tasas registradas para estos filtros.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        {filtered.length > pageSize && <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3 text-sm dark:border-stone-800"><p className="text-stone-500">Página {page} de {pages}</p><div className="flex gap-2"><button aria-label="Página anterior" className="grid size-8 place-items-center rounded-lg border border-stone-200 disabled:opacity-40 dark:border-stone-700" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><button aria-label="Página siguiente" className="grid size-8 place-items-center rounded-lg border border-stone-200 disabled:opacity-40 dark:border-stone-700" disabled={page === pages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div>}
      </section>

      {manualOpen && <ManualRateDialog currencies={currencies} onClose={() => setManualOpen(false)} onSaved={async () => { setManualOpen(false); setMessage({ tone: "success", text: "La tasa manual quedó registrada con su motivo y responsable." }); await load(appliedRange); }} />}
    </div>
  );
}

function RateCard({ definition, rate, loading }: { definition: CurrencyDefinition; rate?: Rate; loading: boolean }) {
  return <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-lg bg-[#edf4ef] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><CircleDollarSign size={18} /></span>{rate ? <SourceBadge rate={rate} compact /> : <span className="text-xs text-stone-500">{definition.sourceName ?? "Fuente manual"}</span>}</div><p className="mt-5 text-sm text-stone-500">{definition.name} · {definition.code}</p>{loading ? <LoaderCircle className="mt-3 animate-spin text-stone-400" size={20} /> : rate ? <><p className="mt-1 text-2xl font-semibold tabular-nums">Bs {formatRate(rate.rate)}</p><p className="mt-2 text-xs text-stone-500">Fecha valor {formatDate(rate.effectiveDate)}</p></> : <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">Sin tasa registrada</p>}</article>;
}

function AutomationCard({ automation, runs }: { automation: Automation; runs: SyncRun[] }) {
  const last = runs[0];
  const recentFailures = runs.filter((run) => run.status === "FAILED").length;
  return <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><CalendarClock size={18} /></span><div><h2 className="font-semibold">Búsqueda automática</h2><p className="mt-1 text-sm text-stone-500">Días hábiles · cada {automation.intervalMinutes} min · {automation.startsAt}–{automation.endsAt}</p></div></div><div className="mt-4 border-t border-stone-100 pt-4 text-sm dark:border-stone-800">{last ? <><div className="flex items-center justify-between gap-3"><span className="text-stone-500">Último intento</span><RunStatus status={last.status} /></div><p className="mt-2 text-xs text-stone-500">{dateTimeFormatter.format(new Date(last.startedAt))}{last.effectiveDate ? ` · fecha valor ${formatDate(last.effectiveDate)}` : ""}</p>{recentFailures > 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{recentFailures} intento{recentFailures === 1 ? "" : "s"} fallido{recentFailures === 1 ? "" : "s"} entre los últimos {runs.length}.</p>}</> : <p className="text-stone-500">Aún no se han ejecutado intentos.</p>}</div></article>;
}

function RunStatus({ status }: { status: SyncRun["status"] }) {
  if (status === "FAILED") return <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300"><AlertCircle size={14} /> Falló</span>;
  if (status === "NO_CHANGE") return <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 dark:text-stone-300"><CheckCircle2 size={14} /> Sin cambios</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={14} /> Guardado</span>;
}

function SourceBadge({ rate, compact = false }: { rate: Rate; compact?: boolean }) {
  if (rate.sourceKind === "BCV") return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Landmark size={compact ? 12 : 13} /> BCV oficial</span>;
  return <span title={rate.manualReason ?? undefined} className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">Manual</span>;
}

function Notice({ message }: { message: { tone: "success" | "error" | "info"; text: string } }) {
  const success = message.tone === "success";
  return <div aria-live="polite" className={`mt-5 flex gap-3 rounded-lg border p-4 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100"}`}>{success ? <CheckCircle2 className="shrink-0" size={18} /> : <AlertCircle className="shrink-0" size={18} />}<p>{message.text}</p></div>;
}

function ManualRateDialog({ currencies, onClose, onSaved }: { currencies: CurrencyDefinition[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [currency, setCurrency] = useState<Currency>(currencies[0]?.code ?? "USD");
  const [effectiveDate, setEffectiveDate] = useState(isoOffset(0));
  const [rate, setRate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/firm/exchange-rates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currency, effectiveDate, rate, reason }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible registrar la tasa.");
      await onSaved();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible registrar la tasa."); }
    finally { setSaving(false); }
  };
  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-4" role="dialog"><div className="w-full max-w-lg rounded-t-2xl bg-white shadow-xl dark:bg-stone-900 sm:rounded-2xl"><div className="flex items-start justify-between border-b border-stone-100 p-5 dark:border-stone-800"><div><h2 className="text-lg font-semibold">Registrar tasa manual</h2><p className="mt-1 text-sm text-stone-500">Úsala cuando la consulta configurada no esté disponible.</p></div><button aria-label="Cerrar" className="grid size-8 place-items-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800" onClick={onClose}><X size={18} /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="field-label">Moneda<SimpleSelect className="field mt-1.5" onChange={(event) => setCurrency(event.target.value)} value={currency}>{currencies.map((item) => <option key={item.code} value={item.code}>{item.name} · {item.code}</option>)}</SimpleSelect></label><label className="field-label">Fecha valor<DatePicker className="field mt-1.5" onChange={(event) => setEffectiveDate(event.target.value)} value={effectiveDate} /></label><label className="field-label sm:col-span-2">Monto en bolívares<input className="field mt-1.5" inputMode="decimal" onChange={(event) => setRate(event.target.value)} placeholder="0,00000000" value={rate} /></label><label className="field-label sm:col-span-2">Motivo del registro<textarea className="field mt-1.5 min-h-24 py-2" maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="Explica por qué se utiliza una tasa manual y cuál fue la referencia consultada." value={reason} /></label><div className="sm:col-span-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Una tasa manual queda identificada como tal. Si luego la fuente oficial publica una tasa para la misma fecha, la oficial pasa a ser la vigente y se conserva el historial manual.</div>{error && <p className="text-sm font-medium text-rose-700 dark:text-rose-300 sm:col-span-2">{error}</p>}</div><div className="flex justify-end gap-2 border-t border-stone-100 p-5 dark:border-stone-800"><button className="h-9 rounded-lg border border-stone-200 px-4 text-sm font-medium dark:border-stone-700" onClick={onClose}>Cancelar</button><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-4 text-sm font-medium text-white disabled:opacity-50" disabled={saving || !rate || reason.trim().length < 8 || !currency} onClick={save}>{saving && <LoaderCircle className="animate-spin" size={15} />} Guardar tasa</button></div></div></div>;
}

function formatDate(value: string) { return value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : "Sin fecha"; }
function formatShortDate(value: string) { return value ? shortDateFormatter.format(new Date(`${value}T00:00:00Z`)) : ""; }
function formatRate(value: string) { return rateFormatter.format(Number(value)); }
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
