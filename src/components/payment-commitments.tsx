"use client";

import {
  CalendarCheck,
  Check,
  CheckCircle2,
  ClipboardCopy,
  CircleDollarSign,
  Download,
  ImageDown,
  Plus,
  RotateCcw,
  Search,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Commitment = {
  id: string;
  concept: string;
  authority: string;
  branch: string;
  period: string;
  dueDate: string;
  amount: number;
  origin: "Sistema" | "Manual";
  paidAt: string | null;
};

type ManualDraft = {
  concept: string;
  authority: string;
  branch: string;
  period: string;
  dueDate: string;
  amount: string;
};

const taxpayer = { name: "Distribuidora El Roble, C.A.", rif: "J-403808880" };
const initialCommitments: Commitment[] = [
  { id: "iae-main", concept: "Actividades económicas", authority: "Alcaldía · Municipio principal", branch: "Casa matriz", period: "Julio 2026", dueDate: "2026-08-14", amount: 1006.72, origin: "Sistema", paidAt: null },
  { id: "iae-branch", concept: "Actividades económicas", authority: "Alcaldía · Municipio de la sucursal", branch: "Sucursal Centro", period: "Julio 2026", dueDate: "2026-08-14", amount: 687.6, origin: "Sistema", paidAt: null },
  { id: "cleaning", concept: "Aseo urbano", authority: "Alcaldía · Municipio principal", branch: "Casa matriz", period: "Julio 2026", dueDate: "2026-08-10", amount: 3840, origin: "Sistema", paidAt: null },
  { id: "gas", concept: "Gas", authority: "Prestador de gas", branch: "Casa matriz", period: "Julio 2026", dueDate: "2026-08-05", amount: 1280, origin: "Sistema", paidAt: null },
  { id: "fine", concept: "Multa administrativa", authority: "Alcaldía · Municipio principal", branch: "Casa matriz", period: "Julio 2026", dueDate: "2026-08-08", amount: 690, origin: "Manual", paidAt: null },
  { id: "water-paid", concept: "Servicio de agua", authority: "Prestador de agua", branch: "Casa matriz", period: "Junio 2026", dueDate: "2026-07-18", amount: 940, origin: "Sistema", paidAt: "2026-07-16" },
  { id: "electricity-paid", concept: "Electricidad", authority: "Prestador eléctrico", branch: "Sucursal Centro", period: "Junio 2026", dueDate: "2026-07-20", amount: 2230, origin: "Sistema", paidAt: "2026-07-18" },
];
const emptyDraft: ManualDraft = { concept: "", authority: "", branch: "Casa matriz", period: "", dueDate: "", amount: "" };
const money = new Intl.NumberFormat("es-VE", { style: "currency", currency: "VES", minimumFractionDigits: 2 });
const number = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function displayDate(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, "d MMM yyyy", { locale: es }) : value;
}

function parseAmount(value: string) {
  const compact = value.trim().replace(/\s/g, "");
  return Number(compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact);
}

function sortPendingFirst(items: Commitment[]) {
  return [...items].sort((a, b) => {
    if (Boolean(a.paidAt) !== Boolean(b.paidAt)) return a.paidAt ? 1 : -1;
    if (!a.paidAt && !b.paidAt) return a.dueDate.localeCompare(b.dueDate);
    return (b.paidAt ?? "").localeCompare(a.paidAt ?? "");
  });
}

export function PaymentCommitments() {
  const [commitments, setCommitments] = useState(initialCommitments);
  const [selected, setSelected] = useState(() => new Set(initialCommitments.filter((item) => !item.paidAt).map((item) => item.id)));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [pageSize, setPageSize] = useState("25");
  const [page, setPage] = useState(1);
  const [paymentTarget, setPaymentTarget] = useState<Commitment | null>(null);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualOpen, setManualOpen] = useState(false);
  const [draft, setDraft] = useState<ManualDraft>(emptyDraft);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageHeight, setImageHeight] = useState(1000);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const ordered = useMemo(() => sortPendingFirst(commitments), [commitments]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return ordered.filter((item) => {
      const matchesStatus = status === "Todos" || (status === "Pendientes" ? !item.paidAt : Boolean(item.paidAt));
      const searchable = [item.concept, item.authority, item.branch, item.period].join(" ").toLocaleLowerCase("es");
      return matchesStatus && (!normalized || searchable.includes(normalized));
    });
  }, [ordered, query, status]);
  const pageCount = pageSize === "Todos" ? 1 : Math.max(1, Math.ceil(filtered.length / Number(pageSize)));
  const currentPage = Math.min(page, pageCount);
  const visible = pageSize === "Todos" ? filtered : filtered.slice((currentPage - 1) * Number(pageSize), currentPage * Number(pageSize));
  const pending = commitments.filter((item) => !item.paidAt);
  const selectedCommitments = sortPendingFirst(commitments.filter((item) => !item.paidAt && selected.has(item.id)));
  const pendingTotal = pending.reduce((sum, item) => sum + item.amount, 0);
  const selectedTotal = selectedCommitments.reduce((sum, item) => sum + item.amount, 0);
  const selectableFiltered = filtered.filter((item) => !item.paidAt);
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every((item) => selected.has(item.id));
  const someFilteredSelected = selectableFiltered.some((item) => selected.has(item.id));
  const manualAmount = parseAmount(draft.amount);
  const manualReady = Boolean(draft.concept.trim() && draft.authority.trim() && draft.period.trim() && draft.dueDate && Number.isFinite(manualAmount) && manualAmount > 0);

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        selectableFiltered.forEach((item) => next.add(item.id));
      } else {
        selectableFiltered.forEach((item) => next.delete(item.id));
      }
      return next;
    });
  }

  function openPayment(item: Commitment) {
    setPaymentTarget(item);
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
  }

  function confirmPayment() {
    if (!paymentTarget || !paymentDate) return;
    setCommitments((items) => items.map((item) => item.id === paymentTarget.id ? { ...item, paidAt: paymentDate } : item));
    setSelected((current) => {
      const next = new Set(current);
      next.delete(paymentTarget.id);
      return next;
    });
    setPaymentTarget(null);
  }

  function reopen(item: Commitment) {
    setCommitments((items) => items.map((current) => current.id === item.id ? { ...current, paidAt: null } : current));
  }

  function addManualCommitment() {
    if (!manualReady) return;
    const item: Commitment = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "manual-" + Date.now(),
      concept: draft.concept.trim(),
      authority: draft.authority.trim(),
      branch: draft.branch,
      period: draft.period.trim(),
      dueDate: draft.dueDate,
      amount: manualAmount,
      origin: "Manual",
      paidAt: null,
    };
    setCommitments((items) => [item, ...items]);
    setSelected((current) => new Set(current).add(item.id));
    setDraft(emptyDraft);
    setManualOpen(false);
    setStatus("Todos");
    setPage(1);
  }

  function generateSummaryImage() {
    if (!selectedCommitments.length) return;
    const width = 1200;
    const headerHeight = 330;
    const rowHeight = 132;
    const footerHeight = 205;
    const height = headerHeight + selectedCommitments.length * rowHeight + footerHeight;
    const scale = window.devicePixelRatio > 1 ? 1.5 : 1;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(scale, scale);
    context.fillStyle = "#f7f7f4";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#14352d";
    context.fillRect(0, 0, width, 22);
    context.beginPath();
    context.roundRect(72, 70, 72, 72, 18);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "700 27px Arial";
    context.textAlign = "center";
    context.fillText("PX", 108, 116);
    context.textAlign = "left";
    context.fillStyle = "#14352d";
    context.font = "700 25px Arial";
    context.fillText("proyectoxyz", 166, 100);
    context.fillStyle = "#66736f";
    context.font = "400 17px Arial";
    context.fillText("Firma contable", 166, 128);
    context.fillStyle = "#2f715f";
    context.font = "700 17px Arial";
    context.fillText("SOLICITUD DE FONDOS PARA PAGOS", 72, 196);
    context.fillStyle = "#1c2522";
    context.font = "700 35px Arial";
    context.fillText(taxpayer.name, 72, 244);
    context.font = "600 19px Arial";
    context.fillText("RIF " + taxpayer.rif, 72, 279);
    context.textAlign = "right";
    context.fillStyle = "#66736f";
    context.font = "400 17px Arial";
    context.fillText("Generado el " + format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es }), width - 72, 112);
    context.textAlign = "left";
    context.fillStyle = "#e6ebe8";
    context.fillRect(72, headerHeight - 24, width - 144, 2);

    let y = headerHeight;
    selectedCommitments.forEach((item, index) => {
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.roundRect(72, y + 10, width - 144, rowHeight - 20, 15);
      context.fill();
      context.fillStyle = "#2f715f";
      context.font = "700 16px Arial";
      context.fillText(String(index + 1).padStart(2, "0"), 96, y + 48);
      context.fillStyle = "#1c2522";
      context.font = "700 21px Arial";
      context.fillText(fitCanvasText(context, item.concept, 460), 148, y + 45);
      context.fillStyle = "#66736f";
      context.font = "400 16px Arial";
      context.fillText(fitCanvasText(context, item.authority + " · " + item.branch, 560), 148, y + 75);
      context.fillText("Período: " + item.period + " · Vence: " + displayDate(item.dueDate), 148, y + 99);
      context.fillStyle = "#1c2522";
      context.font = "700 21px Arial";
      context.textAlign = "right";
      context.fillText("Bs. " + number.format(item.amount), width - 98, y + 62);
      context.textAlign = "left";
      y += rowHeight;
    });
    context.fillStyle = "#14352d";
    context.beginPath();
    context.roundRect(72, y + 26, width - 144, 92, 18);
    context.fill();
    context.fillStyle = "#d9e8e1";
    context.font = "600 18px Arial";
    context.fillText(selectionLabel(selectedCommitments.length), 104, y + 63);
    context.fillStyle = "#ffffff";
    context.font = "700 30px Arial";
    context.textAlign = "right";
    context.fillText("TOTAL  Bs. " + number.format(selectedTotal), width - 104, y + 84);
    context.textAlign = "left";
    context.fillStyle = "#66736f";
    context.font = "400 15px Arial";
    context.fillText("Resumen informativo demostrativo; confirme montos y datos bancarios antes de transferir.", 72, y + 160);
    setImageHeight(height);
    setCopyStatus("idle");
    setImagePreview(canvas.toDataURL("image/png"));
  }

  function downloadImage() {
    if (!imagePreview) return;
    const anchor = document.createElement("a");
    anchor.href = imagePreview;
    anchor.download = "compromisos-" + taxpayer.rif + "-" + format(new Date(), "yyyy-MM-dd") + ".png";
    anchor.click();
  }

  async function copyImage() {
    if (!imagePreview) return;
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Clipboard API unavailable");
      const blob = await fetch(imagePreview).then((response) => response.blob());
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-stone-500">Empresa activa / Pagos</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Compromisos de pago</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">Controla obligaciones automáticas y manuales, prepara el resumen para solicitar los fondos al cliente y registra cuándo la firma ejecutó cada pago.</p>
        </div>
        <Button className="h-9 bg-[#14352d] px-3 text-white hover:bg-[#0e2821]" onClick={() => setManualOpen(true)}><Plus /> Agregar compromiso</Button>
      </header>

      <section className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100">
        <WalletCards className="mt-0.5 shrink-0" size={19} />
        <div><p className="font-semibold">Flujo de fondos</p><p className="mt-1 leading-5">El resumen informa cuánto debe transferir el cliente. Recibir los fondos no marca el compromiso como pagado: la firma lo registra después de ejecutar el pago.</p></div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Metric label="Pendientes" value={String(pending.length)} detail={money.format(pendingTotal) + " por ejecutar"} icon={CalendarCheck} />
        <Metric label="Pagados" value={String(commitments.length - pending.length)} detail="Histórico visible" icon={CheckCircle2} />
        <Metric label="A informar" value={money.format(selectedTotal)} detail={markedLabel(selectedCommitments.length)} icon={CircleDollarSign} />
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
          <div><h2 className="font-semibold">Todos los compromisos</h2><p className="mt-1 text-sm text-stone-500">Los pendientes aparecen primero. “Informar” controla únicamente lo que saldrá en la imagen.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-72"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} /><Input aria-label="Buscar compromisos" className="h-9 bg-white pl-9 dark:bg-stone-800" onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar concepto, organismo..." value={query} /></div>
            <SimpleSelect aria-label="Filtrar por estado" className="sm:w-36" onValueChange={(value) => { setStatus(value); setPage(1); }} value={status}><option>Todos</option><option>Pendientes</option><option>Pagados</option></SimpleSelect>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[1080px] w-full text-left text-sm">
            <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow>
              <TableHead className="w-20 px-5 py-3"><SelectAllCheckbox checked={allFilteredSelected} disabled={!selectableFiltered.length} indeterminate={!allFilteredSelected && someFilteredSelected} onChange={toggleAllFiltered} /></TableHead><TableHead className="px-3 py-3">Compromiso / organismo</TableHead><TableHead className="px-3 py-3">Período de imposición</TableHead><TableHead className="px-3 py-3">Vencimiento</TableHead><TableHead className="px-3 py-3">Estado</TableHead><TableHead className="px-3 py-3 text-right">Monto</TableHead><TableHead className="px-5 py-3 text-right">Acción</TableHead>
            </TableRow></TableHeader>
            <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
              {visible.map((item) => <TableRow className={selected.has(item.id) ? "bg-emerald-50/35 dark:bg-emerald-950/10" : ""} key={item.id}>
                <TableCell className="px-5 py-4"><input aria-label={"Informar " + item.concept} checked={!item.paidAt && selected.has(item.id)} className="size-4 accent-[#14352d]" disabled={Boolean(item.paidAt)} onChange={() => toggleSelected(item.id)} type="checkbox" /></TableCell>
                <TableCell className="px-3 py-4"><div className="flex items-center gap-2"><p className="font-medium">{item.concept}</p>{item.origin === "Manual" && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">Manual</span>}</div><p className="mt-1 text-xs text-stone-500">{item.authority} · {item.branch}</p></TableCell>
                <TableCell className="px-3 py-4 font-medium">{item.period}</TableCell>
                <TableCell className="px-3 py-4 tabular-nums">{displayDate(item.dueDate)}</TableCell>
                <TableCell className="px-3 py-4">{item.paidAt ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 size={14} /> Pagado · {displayDate(item.paidAt)}</span> : <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">Pendiente</span>}</TableCell>
                <TableCell className="px-3 py-4 text-right font-medium tabular-nums">{money.format(item.amount)}</TableCell>
                <TableCell className="px-5 py-4 text-right">{item.paidAt ? <button className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-100" onClick={() => reopen(item)} type="button"><RotateCcw size={14} /> Reabrir</button> : <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 text-xs font-medium hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800" onClick={() => openPayment(item)} type="button"><Check size={14} /> Marcar pagado</button>}</TableCell>
              </TableRow>)}
              {!visible.length && <TableRow><TableCell className="px-5 py-12 text-center text-sm text-stone-500" colSpan={7}>No hay compromisos que coincidan con la búsqueda.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 text-sm dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-stone-500"><span>Mostrar</span><SimpleSelect aria-label="Compromisos por página" className="w-24" onValueChange={(value) => { setPageSize(value); setPage(1); }} value={pageSize}><option value="25">25</option><option value="50">50</option><option>Todos</option></SimpleSelect><span>de {filtered.length}</span></div>
          <div className="flex items-center gap-2"><Button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="outline">Anterior</Button><span className="min-w-20 text-center text-xs text-stone-500">{currentPage} de {pageCount}</span><Button disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} variant="outline">Siguiente</Button></div>
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="font-semibold">Resumen para el contribuyente</p><p className="mt-1 text-sm text-stone-500">{selectionLabel(selectedCommitments.length)} · {money.format(selectedTotal)}. La imagen incluirá razón social, RIF, período, vencimiento y monto.</p></div>
        <Button className="h-10 bg-[#14352d] px-4 text-white hover:bg-[#0e2821]" disabled={!selectedCommitments.length} onClick={generateSummaryImage}><ImageDown /> Generar imagen resumen</Button>
      </section>

      <PaymentDialog date={paymentDate} item={paymentTarget} onClose={() => setPaymentTarget(null)} onConfirm={confirmPayment} onDateChange={setPaymentDate} />
      <ManualCommitmentDialog draft={draft} onChange={setDraft} onClose={() => { setManualOpen(false); setDraft(emptyDraft); }} onSave={addManualCommitment} open={manualOpen} ready={manualReady} />
      <ImagePreviewDialog copyStatus={copyStatus} height={imageHeight} image={imagePreview} onClose={() => setImagePreview(null)} onCopy={copyImage} onDownload={downloadImage} />
    </div>
  );
}

function PaymentDialog({ date, item, onClose, onConfirm, onDateChange }: { date: string; item: Commitment | null; onClose: () => void; onConfirm: () => void; onDateChange: (value: string) => void }) {
  return <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open={Boolean(item)}><DialogContent className="max-w-md gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><DialogTitle>Marcar compromiso como pagado</DialogTitle><DialogDescription>Registra la fecha en que la firma ejecutó el pago.</DialogDescription></DialogHeader><div className="p-5"><div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800"><p className="font-medium">{item?.concept}</p><p className="mt-1 text-sm text-stone-500">{item?.period} · {item ? money.format(item.amount) : ""}</p></div><label className="mt-5 block text-sm font-medium">Fecha de pago<DatePicker className="mt-1.5" onValueChange={onDateChange} value={date} /></label></div><DialogFooter className="border-t border-stone-100 px-5 py-4 dark:border-stone-800"><DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose><Button className="bg-[#14352d] text-white hover:bg-[#0e2821]" disabled={!date} onClick={onConfirm}><Check /> Aceptar pago</Button></DialogFooter></DialogContent></Dialog>;
}

function ManualCommitmentDialog({ draft, onChange, onClose, onSave, open, ready }: { draft: ManualDraft; onChange: (draft: ManualDraft) => void; onClose: () => void; onSave: () => void; open: boolean; ready: boolean }) {
  return <Dialog onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }} open={open}><DialogContent className="max-w-2xl gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><DialogTitle>Agregar compromiso manual</DialogTitle><DialogDescription>Registra pagos que no nacen automáticamente de una obligación o servicio, como una multa.</DialogDescription></DialogHeader><div className="min-h-0 overflow-y-auto p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Concepto *"><Input className="mt-1.5 h-9" onChange={(event) => onChange({ ...draft, concept: event.target.value })} placeholder="Ej. Multa administrativa" value={draft.concept} /></Field><Field label="Organismo o beneficiario *"><Input className="mt-1.5 h-9" onChange={(event) => onChange({ ...draft, authority: event.target.value })} placeholder="Organismo que recibe el pago" value={draft.authority} /></Field><Field label="Sucursal"><SimpleSelect className="mt-1.5" onValueChange={(value) => onChange({ ...draft, branch: value })} value={draft.branch}><option>Casa matriz</option><option>Sucursal Centro</option></SimpleSelect></Field><Field label="Período de imposición *"><Input className="mt-1.5 h-9" onChange={(event) => onChange({ ...draft, period: event.target.value })} placeholder="Ej. Julio 2026" value={draft.period} /></Field><Field label="Fecha de vencimiento *"><DatePicker className="mt-1.5" onValueChange={(value) => onChange({ ...draft, dueDate: value })} value={draft.dueDate} /></Field><Field label="Monto (VES) *"><Input className="mt-1.5 h-9" inputMode="decimal" onChange={(event) => onChange({ ...draft, amount: event.target.value })} placeholder="0,00" value={draft.amount} /></Field></div><p className="mt-4 text-xs leading-5 text-stone-500">El compromiso quedará identificado como manual y seleccionado para el próximo resumen. Esta vista demostrativa no guarda aún los cambios en un servidor.</p></div><DialogFooter className="border-t border-stone-100 px-5 py-4 dark:border-stone-800"><DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose><Button className="bg-[#14352d] text-white hover:bg-[#0e2821]" disabled={!ready} onClick={onSave}><Plus /> Agregar compromiso</Button></DialogFooter></DialogContent></Dialog>;
}

function ImagePreviewDialog({ copyStatus, height, image, onClose, onCopy, onDownload }: { copyStatus: "idle" | "copied" | "error"; height: number; image: string | null; onClose: () => void; onCopy: () => void; onDownload: () => void }) {
  return <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open={Boolean(image)}><DialogContent className="max-w-3xl gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><DialogTitle>Imagen resumen lista</DialogTitle><DialogDescription>Revisa el contenido antes de compartirlo con el cliente.</DialogDescription></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto bg-stone-100 p-4 dark:bg-stone-950">{image && <img alt="Resumen de compromisos seleccionados" className="mx-auto h-auto w-full max-w-2xl rounded-lg border border-stone-200 bg-white shadow-sm" height={height} src={image} width={1200} />}</div><DialogFooter className="border-t border-stone-100 bg-white px-5 py-4 dark:border-stone-800 dark:bg-stone-900"><span aria-live="polite" className="mr-auto self-center text-xs text-rose-600">{copyStatus === "error" ? "El navegador no permitió copiar la imagen." : ""}</span><DialogClose render={<Button variant="outline" />}>Cerrar</DialogClose><Button onClick={onCopy} variant="outline"><ClipboardCopy /> {copyStatus === "copied" ? "Copiada" : "Copiar imagen"}</Button><Button className="bg-[#14352d] text-white hover:bg-[#0e2821]" onClick={onDownload}><Download /> Descargar PNG</Button></DialogFooter></DialogContent></Dialog>;
}

function SelectAllCheckbox({ checked, disabled, indeterminate, onChange }: { checked: boolean; disabled: boolean; indeterminate: boolean; onChange: (checked: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <label className="inline-flex items-center gap-2"><input aria-label="Seleccionar o desmarcar todos los compromisos pendientes filtrados" checked={checked} className="size-4 accent-[#14352d]" disabled={disabled} onClick={() => onChange(!checked)} readOnly ref={ref} type="checkbox" /><span>Todos</span></label>;
}

function selectionLabel(count: number) {
  return count === 1 ? "1 compromiso seleccionado" : count + " compromisos seleccionados";
}

function markedLabel(count: number) {
  return count === 1 ? "1 compromiso marcado" : count + " compromisos marcados";
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="text-sm font-medium">{label}{children}</label>;
}

function Metric({ detail, icon: Icon, label, value }: { detail: string; icon: LucideIcon; label: string; value: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex items-center justify-between gap-3"><p className="text-sm text-stone-500">{label}</p><Icon className="text-stone-400" size={17} /></div><p className="mt-2 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div>;
}

function fitCanvasText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let shortened = value;
  while (shortened.length && context.measureText(shortened + "…").width > maxWidth) shortened = shortened.slice(0, -1);
  return shortened + "…";
}
