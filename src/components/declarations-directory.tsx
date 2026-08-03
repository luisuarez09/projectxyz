"use client";

import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, FileText, LoaderCircle, Plus, ReceiptText, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCompanyContext } from "@/components/company-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Status = "PENDING" | "PREPARING" | "READY_FOR_REVIEW" | "SUBMITTED" | "PAID" | "CLOSED" | "INCIDENT" | "NOT_APPLICABLE";
type Declaration = {
  id: string;
  tax: string;
  offeringKey: string;
  templateKey: string | null;
  periodKey: string;
  period: string;
  cadence: string;
  deadlineBasis: string;
  dueDate: string;
  status: Status;
  amount: string;
  owner: string;
};
type DirectoryResponse = { company: { legalName: string; rif: string }; declarations: Declaration[]; canManage: boolean };

const statusLabels: Record<Status, string> = {
  PENDING: "Pendiente",
  PREPARING: "En preparación",
  READY_FOR_REVIEW: "Listo para revisión",
  SUBMITTED: "Declarada",
  PAID: "Pagada",
  CLOSED: "Cerrada",
  INCIDENT: "Con incidencia",
  NOT_APPLICABLE: "No aplica",
};
const statusStyles: Record<Status, string> = {
  PENDING: "border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300",
  PREPARING: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  READY_FOR_REVIEW: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  SUBMITTED: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  CLOSED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  INCIDENT: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
  NOT_APPLICABLE: "border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800",
};
const money = new Intl.NumberFormat("es-VE", { style: "currency", currency: "VES", minimumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function hrefFor(item: Pick<Declaration, "templateKey" | "periodKey">) {
  return item.templateKey ? `/declaraciones/${item.templateKey}?period=${item.periodKey}` : "/declaraciones";
}

function displayDate(value: string) {
  return value ? date.format(new Date(`${value}T00:00:00.000Z`)) : "Por configurar";
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function DeclarationsDirectory() {
  const router = useRouter();
  const { activeCompany, activeCompanyId, loading: companyLoading, offerings } = useCompanyContext();
  const [data, setData] = useState<DirectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [kind, setKind] = useState("iva");
  const [period, setPeriod] = useState(currentPeriod);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "closed">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (companyLoading) return;
    if (!activeCompanyId) {
      setData(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/declarations", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No fue posible cargar las declaraciones.");
        setData(body);
        setError("");
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "No fue posible cargar las declaraciones.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [activeCompanyId, companyLoading]);

  const taxOptions = useMemo(() => offerings.filter((offering) =>
    offering.kind === "TAX" && activeCompany?.taxOfferingKeys.includes(offering.id),
  ), [activeCompany, offerings]);
  useEffect(() => {
    if (!taxOptions.some(({ id }) => id === kind) && taxOptions[0]) setKind(taxOptions[0].id);
  }, [kind, taxOptions]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return (data?.declarations ?? []).filter((item) => {
      const matchesQuery = !normalized || `${item.tax} ${item.period} ${item.owner}`.toLocaleLowerCase("es").includes(normalized);
      const isClosed = ["SUBMITTED", "PAID", "CLOSED"].includes(item.status);
      return matchesQuery && (status === "all" || (status === "closed" ? isClosed : !isClosed));
    });
  }, [data, query, status]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const openCount = (data?.declarations ?? []).filter(({ status: itemStatus }) => !["SUBMITTED", "PAID", "CLOSED", "NOT_APPLICABLE"].includes(itemStatus)).length;
  const reviewCount = (data?.declarations ?? []).filter(({ status: itemStatus }) => itemStatus === "READY_FOR_REVIEW").length;
  const closedCount = (data?.declarations ?? []).filter(({ status: itemStatus }) => ["SUBMITTED", "PAID", "CLOSED"].includes(itemStatus)).length;
  const selectedOffering = taxOptions.find(({ id }) => id === kind);
  const selectedTemplate = kind === "iva" ? "iva" : kind;

  function createDeclaration() {
    setCreateOpen(false);
    router.push(`/declaraciones/${selectedTemplate}?period=${period}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-sm text-stone-500">Empresa activa / Cumplimiento tributario</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Declaraciones</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Expedientes abiertos y cerrados por impuesto y período. Cada registro conserva su determinación, presentación y evidencias.</p></div>
        <div className="flex flex-wrap gap-2"><Link className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800" href="/declaraciones/estatus"><CalendarDays size={16} /> Estatus anual</Link><Button className="bg-[#14352d] text-white hover:bg-[#0e2821]" disabled={!activeCompany || !data?.canManage || taxOptions.length === 0} onClick={() => setCreateOpen(true)}><Plus /> Crear declaración</Button></div>
      </div>

      {!companyLoading && !activeCompany ? <State icon={ReceiptText} title="Selecciona una empresa" description="Las declaraciones pertenecen a una empresa específica. Selecciónala en el encabezado para continuar." /> : <>
        <div className="mt-7 grid gap-4 sm:grid-cols-3"><Summary label="En proceso" value={String(openCount)} detail="Pendientes o en preparación" tone="sky" /><Summary label="Por revisar" value={String(reviewCount)} detail="Esperan validación interna" tone="amber" /><Summary label="Cerradas" value={String(closedCount)} detail="Presentadas, pagadas o cerradas" tone="emerald" /></div>
        <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">Expedientes de {data?.company.legalName ?? activeCompany?.legalName}</h2><p className="mt-1 text-sm text-stone-500">Incluye períodos anteriores y declaraciones ya cerradas.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-2.5 text-stone-400" size={16} /><Input className="field w-full pl-9 sm:w-64" onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar impuesto o período" value={query} /></label><SimpleSelect className="field sm:w-44" onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} value={status}><option value="all">Todos los estatus</option><option value="open">Abiertas</option><option value="closed">Cerradas</option></SimpleSelect></div></div>
          {loading ? <div className="grid min-h-60 place-items-center text-sm text-stone-500"><LoaderCircle className="mb-2 animate-spin" /> Cargando declaraciones…</div> : error ? <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : <>
            <div className="overflow-x-auto"><Table className="min-w-[900px] w-full text-left text-sm"><TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="px-5 py-3">Impuesto / período</TableHead><TableHead className="px-3 py-3">Fecha tope</TableHead><TableHead className="px-3 py-3">Responsable</TableHead><TableHead className="px-3 py-3 text-right">Monto</TableHead><TableHead className="px-5 py-3">Estatus</TableHead><TableHead className="w-12 px-5 py-3" /></TableRow></TableHeader><TableBody className="divide-y divide-stone-100 dark:divide-stone-800">{rows.map((item) => <TableRow className="hover:bg-stone-50 dark:hover:bg-stone-800/50" key={item.id}><TableCell className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><ReceiptText size={17} /></div><div><p className="font-medium">{item.tax}</p><p className="mt-0.5 text-xs text-stone-500">{item.period} · {item.cadence}</p></div></div></TableCell><TableCell className="px-3 py-4"><p className="font-medium">{displayDate(item.dueDate)}</p><p className="mt-1 max-w-56 text-xs text-stone-500">{item.deadlineBasis}</p></TableCell><TableCell className="px-3 py-4"><span className="grid size-7 place-items-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300" title={item.owner}>{item.owner.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span></TableCell><TableCell className="px-3 py-4 text-right font-medium tabular-nums">{item.amount ? money.format(Number(item.amount)) : "—"}</TableCell><TableCell className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span></TableCell><TableCell className="px-5 py-4"><Link aria-label={`Abrir ${item.tax} ${item.period}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-[#14352d] dark:hover:bg-stone-800" href={hrefFor(item)}><ChevronRight size={17} /></Link></TableCell></TableRow>)}{rows.length === 0 && <TableRow><TableCell className="py-12 text-center text-stone-500" colSpan={6}>No hay declaraciones que coincidan con los filtros.</TableCell></TableRow>}</TableBody></Table></div>
            <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-3 text-sm dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"><p className="text-stone-500">Mostrando {rows.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}</p><div className="flex items-center gap-2"><Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} size="sm" variant="outline"><ChevronLeft /> Anterior</Button><span className="text-xs">Página {currentPage} de {pageCount}</span><Button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} size="sm" variant="outline">Siguiente <ChevronRight /></Button></div></div>
          </>}
        </section>
      </>}

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent className="max-w-lg gap-0 p-0">
          <DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><FileText size={19} /></div><div><DialogTitle>Crear declaración</DialogTitle><DialogDescription className="mt-1">Abre el expediente de la empresa activa con la regla fiscal vigente.</DialogDescription></div></div></DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto p-5"><label className="block text-sm font-medium">Tipo de impuesto<SimpleSelect className="field mt-1.5" onChange={(event) => setKind(event.target.value)} value={kind}>{taxOptions.map((offering) => <option key={offering.id} value={offering.id}>{offering.name} · {offering.cadence}</option>)}</SimpleSelect></label><label className="block text-sm font-medium">Período de imposición<Input className="field mt-1.5" max={currentPeriod()} onChange={(event) => setPeriod(event.target.value)} type="month" value={period} /></label><div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs leading-5 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"><CalendarDays className="mr-1 inline" size={14} /> {kind === "iva" ? "El expediente consolidará las ventas del período y mostrará únicamente compras y retenciones aún disponibles." : `Se aplicará la configuración vigente de ${selectedOffering?.name ?? "este impuesto"}.`}</div></div>
          <DialogFooter className="border-t border-stone-100 px-5 py-4 dark:border-stone-800"><DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose><Button className="bg-[#14352d] text-white hover:bg-[#0e2821]" disabled={!kind || !period} onClick={createDeclaration}>Crear <ChevronRight /></Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Summary({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "sky" | "amber" | "emerald" }) {
  const colors = { sky: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300", emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300" };
  return <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex items-start justify-between"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div><div className={`grid size-9 place-items-center rounded-lg ${colors[tone]}`}><CircleAlert size={18} /></div></div></div>;
}

function State({ icon: Icon, title, description }: { icon: typeof ReceiptText; title: string; description: string }) {
  return <div className="mt-7 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center dark:border-stone-700 dark:bg-stone-900"><Icon className="mx-auto text-stone-400" size={28} /><h2 className="mt-3 font-semibold">{title}</h2><p className="mx-auto mt-1 max-w-lg text-sm text-stone-500">{description}</p></div>;
}
