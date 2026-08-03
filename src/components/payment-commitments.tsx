"use client";

import {
  AlertCircle,
  CalendarCheck,
  Check,
  CheckCircle2,
  ClipboardCopy,
  CircleDollarSign,
  Download,
  ImageDown,
  LoaderCircle,
  Search,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useCompanyContext } from "@/components/company-context";
import { AttachmentInput } from "@/components/ui/attachment-input";
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
import type { CalendarCaseView } from "@/modules/calendar/domain/calendar";

type CommitmentsResponse = {
  company: { id: string; legalName: string; rif: string };
  cases: CalendarCaseView[];
  canManage: boolean;
};

type StatusFilter = "Pendientes" | "Todos" | "Pagados";

const money = new Intl.NumberFormat("es-VE", { style: "currency", currency: "VES", minimumFractionDigits: 2 });
const number = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function displayDate(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, "d MMM yyyy", { locale: es }) : "Sin fecha";
}

function amountOf(item: CalendarCaseView) {
  return Number(item.amount.replace(",", ".")) || 0;
}

function isPaid(item: CalendarCaseView) {
  return Boolean(item.paidAt) || item.status === "PAID" || item.status === "CLOSED";
}

function sortPendingFirst(items: CalendarCaseView[]) {
  return [...items].sort((left, right) => {
    if (isPaid(left) !== isPaid(right)) return isPaid(left) ? 1 : -1;
    if (!isPaid(left)) return (left.dueDate || "9999").localeCompare(right.dueDate || "9999");
    return right.paidAt.localeCompare(left.paidAt);
  });
}

export function PaymentCommitments() {
  const { activeCompanyId, loading: companyLoading } = useCompanyContext();
  const [data, setData] = useState<CommitmentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("Pendientes");
  const [pageSize, setPageSize] = useState("25");
  const [page, setPage] = useState(1);
  const [paymentTarget, setPaymentTarget] = useState<CalendarCaseView | null>(null);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageHeight, setImageHeight] = useState(1000);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const load = useCallback(async () => {
    if (!activeCompanyId) {
      setData(null);
      setSelected(new Set());
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/payment-commitments", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible cargar los compromisos.");
      const next = body as CommitmentsResponse;
      setData(next);
      setSelected(new Set(next.cases.filter((item) => !isPaid(item)).map(({ id }) => id)));
      setError("");
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : "No fue posible cargar los compromisos.");
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); setSavedMessage(""); }, [activeCompanyId]);

  const commitments = data?.cases ?? [];
  const ordered = useMemo(() => sortPendingFirst(commitments), [commitments]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return ordered.filter((item) => {
      const paid = isPaid(item);
      const matchesStatus = status === "Todos" || (status === "Pendientes" ? !paid : paid);
      const searchable = [item.offeringName, item.organism, item.periodLabel, item.companyName].join(" ").toLocaleLowerCase("es");
      return matchesStatus && (!normalized || searchable.includes(normalized));
    });
  }, [ordered, query, status]);
  const pageCount = pageSize === "Todos" ? 1 : Math.max(1, Math.ceil(filtered.length / Number(pageSize)));
  const currentPage = Math.min(page, pageCount);
  const visible = pageSize === "Todos" ? filtered : filtered.slice((currentPage - 1) * Number(pageSize), currentPage * Number(pageSize));
  const pending = commitments.filter((item) => !isPaid(item));
  const selectedCommitments = sortPendingFirst(pending.filter((item) => selected.has(item.id)));
  const pendingTotal = pending.reduce((sum, item) => sum + amountOf(item), 0);
  const selectedTotal = selectedCommitments.reduce((sum, item) => sum + amountOf(item), 0);
  const selectableFiltered = filtered.filter((item) => !isPaid(item));
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every((item) => selected.has(item.id));
  const someFilteredSelected = selectableFiltered.some((item) => selected.has(item.id));

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
      selectableFiltered.forEach((item) => checked ? next.add(item.id) : next.delete(item.id));
      return next;
    });
  }

  function openPayment(item: CalendarCaseView) {
    setPaymentTarget(item);
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentFile(null);
    setPaymentError("");
  }

  async function confirmPayment() {
    if (!paymentTarget || !paymentDate || !data?.canManage) return;
    setPaying(true);
    setPaymentError("");
    try {
      if (paymentFile) {
        const formData = new FormData();
        formData.set("kind", "PAYMENT_RECEIPT");
        formData.set("file", paymentFile);
        const uploadResponse = await fetch(`/api/calendar/${paymentTarget.id}/evidence`, { method: "POST", body: formData });
        const uploadBody = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadBody.error ?? "No fue posible adjuntar el comprobante.");
      }
      const response = await fetch(`/api/calendar/${paymentTarget.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: paymentTarget.version,
          status: "PAID",
          activityMode: paymentTarget.activityMode,
          filedAt: paymentTarget.filedAt,
          paidAt: paymentDate,
          amount: paymentTarget.amount,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible cerrar el compromiso.");
      const savedCase = body.case as CalendarCaseView;
      setData((current) => current ? { ...current, cases: current.cases.map((item) => item.id === savedCase.id ? savedCase : item) } : current);
      setSelected((current) => { const next = new Set(current); next.delete(savedCase.id); return next; });
      setPaymentTarget(null);
      setSavedMessage(`${savedCase.offeringName} quedó pagado y el expediente fue actualizado.`);
    } catch (reason) {
      setPaymentError(reason instanceof Error ? reason.message : "No fue posible cerrar el compromiso.");
    } finally {
      setPaying(false);
    }
  }

  function generateSummaryImage() {
    if (!selectedCommitments.length || !data) return;
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
    context.beginPath(); context.roundRect(72, 70, 72, 72, 18); context.fill();
    context.fillStyle = "#fff"; context.font = "700 27px Arial"; context.textAlign = "center"; context.fillText("PX", 108, 116);
    context.textAlign = "left"; context.fillStyle = "#14352d"; context.font = "700 25px Arial"; context.fillText("proyectoxyz", 166, 100);
    context.fillStyle = "#66736f"; context.font = "400 17px Arial"; context.fillText("Firma contable", 166, 128);
    context.fillStyle = "#2f715f"; context.font = "700 17px Arial"; context.fillText("SOLICITUD DE FONDOS PARA PAGOS", 72, 196);
    context.fillStyle = "#1c2522"; context.font = "700 35px Arial"; context.fillText(fitCanvasText(context, data.company.legalName, 760), 72, 244);
    context.font = "600 19px Arial"; context.fillText(`RIF ${data.company.rif}`, 72, 279);
    context.textAlign = "right"; context.fillStyle = "#66736f"; context.font = "400 17px Arial"; context.fillText(`Generado el ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, width - 72, 112);
    context.textAlign = "left"; context.fillStyle = "#e6ebe8"; context.fillRect(72, headerHeight - 24, width - 144, 2);
    let y = headerHeight;
    selectedCommitments.forEach((item, index) => {
      context.fillStyle = "#fff"; context.beginPath(); context.roundRect(72, y + 10, width - 144, rowHeight - 20, 15); context.fill();
      context.fillStyle = "#2f715f"; context.font = "700 16px Arial"; context.fillText(String(index + 1).padStart(2, "0"), 96, y + 48);
      context.fillStyle = "#1c2522"; context.font = "700 21px Arial"; context.fillText(fitCanvasText(context, item.offeringName, 460), 148, y + 45);
      context.fillStyle = "#66736f"; context.font = "400 16px Arial"; context.fillText(fitCanvasText(context, item.organism, 560), 148, y + 75);
      context.fillText(`Período: ${item.periodLabel} · Vence: ${displayDate(item.dueDate)}`, 148, y + 99);
      context.fillStyle = "#1c2522"; context.font = "700 21px Arial"; context.textAlign = "right"; context.fillText(`Bs. ${number.format(amountOf(item))}`, width - 98, y + 62);
      context.textAlign = "left"; y += rowHeight;
    });
    context.fillStyle = "#14352d"; context.beginPath(); context.roundRect(72, y + 26, width - 144, 92, 18); context.fill();
    context.fillStyle = "#d9e8e1"; context.font = "600 18px Arial"; context.fillText(selectionLabel(selectedCommitments.length), 104, y + 63);
    context.fillStyle = "#fff"; context.font = "700 30px Arial"; context.textAlign = "right"; context.fillText(`TOTAL  Bs. ${number.format(selectedTotal)}`, width - 104, y + 84);
    context.textAlign = "left"; context.fillStyle = "#66736f"; context.font = "400 15px Arial"; context.fillText("Confirme los montos y los datos bancarios antes de transferir.", 72, y + 160);
    setImageHeight(height); setCopyStatus("idle"); setImagePreview(canvas.toDataURL("image/png"));
  }

  function downloadImage() {
    if (!imagePreview || !data) return;
    const anchor = document.createElement("a"); anchor.href = imagePreview;
    anchor.download = `compromisos-${data.company.rif}-${format(new Date(), "yyyy-MM-dd")}.png`; anchor.click();
  }

  async function copyImage() {
    if (!imagePreview) return;
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error();
      const blob = await fetch(imagePreview).then((response) => response.blob());
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); setCopyStatus("copied");
    } catch { setCopyStatus("error"); }
  }

  if (companyLoading || loading) return <StatePanel icon={LoaderCircle} title="Cargando compromisos…" description="Consultando los expedientes de la empresa activa." spinning />;
  if (!activeCompanyId) return <StatePanel icon={WalletCards} title="Selecciona una empresa" description="Los compromisos se consultan y se actualizan dentro del expediente de una empresa específica." />;
  if (error) return <StatePanel icon={AlertCircle} title="No fue posible cargar los compromisos" description={error} action={<Button onClick={() => void load()} variant="outline">Reintentar</Button>} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <header><p className="text-sm text-stone-500">Empresa activa / Pagos</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Compromisos de pago</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">Prepara la solicitud de fondos con los montos registrados en los expedientes y cierra cada obligación cuando la firma ejecute el pago.</p></header>

      <section className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100"><WalletCards className="mt-0.5 shrink-0" size={19} /><div><p className="font-semibold">Flujo de fondos</p><p className="mt-1 leading-5">Recibir la transferencia del cliente no cambia el estado. El compromiso se cierra cuando registras el pago ejecutado y, si corresponde, adjuntas su comprobante.</p></div></section>
      {savedMessage && <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-stone-900 dark:text-emerald-300"><CheckCircle2 size={17} />{savedMessage}</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Metric label="Pendientes" value={String(pending.length)} detail={`${money.format(pendingTotal)} por ejecutar`} icon={CalendarCheck} />
        <Metric label="Pagados" value={String(commitments.length - pending.length)} detail="Histórico visible en Todos" icon={CheckCircle2} />
        <Metric label="A informar" value={money.format(selectedTotal)} detail={markedLabel(selectedCommitments.length)} icon={CircleDollarSign} />
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-semibold">Compromisos</h2><p className="mt-1 text-sm text-stone-500">Se muestran primero los pendientes. “Informar” solo controla qué filas aparecerán en la imagen.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative sm:w-72"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} /><Input aria-label="Buscar compromisos" className="h-9 bg-white pl-9 dark:bg-stone-800" onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar obligación, organismo…" value={query} /></div><SimpleSelect aria-label="Filtrar por estado" className="sm:w-36" onValueChange={(value) => { setStatus(value as StatusFilter); setPage(1); }} value={status}><option>Pendientes</option><option>Todos</option><option>Pagados</option></SimpleSelect></div></div>
        <div className="overflow-x-auto"><Table className="min-w-[1000px] w-full text-left text-sm"><TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="w-20 px-5 py-3"><SelectAllCheckbox checked={allFilteredSelected} disabled={!selectableFiltered.length} indeterminate={!allFilteredSelected && someFilteredSelected} onChange={toggleAllFiltered} /></TableHead><TableHead className="px-3 py-3">Compromiso / organismo</TableHead><TableHead className="px-3 py-3">Período</TableHead><TableHead className="px-3 py-3">Vencimiento</TableHead><TableHead className="px-3 py-3">Estado</TableHead><TableHead className="px-3 py-3 text-right">Monto</TableHead><TableHead className="px-5 py-3 text-right">Acción</TableHead></TableRow></TableHeader><TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
          {visible.map((item) => <TableRow className={selected.has(item.id) ? "bg-emerald-50/35 dark:bg-emerald-950/10" : ""} key={item.id}><TableCell className="px-5 py-4"><input aria-label={`Informar ${item.offeringName}`} checked={!isPaid(item) && selected.has(item.id)} className="size-4 accent-[#14352d]" disabled={isPaid(item)} onChange={() => toggleSelected(item.id)} type="checkbox" /></TableCell><TableCell className="px-3 py-4"><p className="font-medium">{item.offeringName}</p><p className="mt-1 text-xs text-stone-500">{item.organism}</p></TableCell><TableCell className="px-3 py-4 font-medium">{item.periodLabel}</TableCell><TableCell className="px-3 py-4 tabular-nums">{displayDate(item.dueDate)}</TableCell><TableCell className="px-3 py-4">{isPaid(item) ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 size={14} /> Pagado · {displayDate(item.paidAt)}</span> : <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">Pendiente de pago</span>}</TableCell><TableCell className="px-3 py-4 text-right font-medium tabular-nums">{money.format(amountOf(item))}</TableCell><TableCell className="px-5 py-4 text-right">{isPaid(item) ? <span className="text-xs text-stone-400">Cerrado</span> : <Button className="h-8" disabled={!data?.canManage} onClick={() => openPayment(item)} size="sm" variant="outline"><Check /> Marcar pagado</Button>}</TableCell></TableRow>)}
          {!visible.length && <TableRow><TableCell className="px-5 py-12 text-center text-sm text-stone-500" colSpan={7}>{status === "Pendientes" ? "No hay compromisos pendientes con monto registrado." : "No hay compromisos que coincidan con la búsqueda."}</TableCell></TableRow>}
        </TableBody></Table></div>
        <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 text-sm dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-stone-500"><span>Mostrar</span><SimpleSelect aria-label="Compromisos por página" className="w-24" onValueChange={(value) => { setPageSize(value); setPage(1); }} value={pageSize}><option value="25">25</option><option value="50">50</option><option>Todos</option></SimpleSelect><span>de {filtered.length}</span></div><div className="flex items-center gap-2"><Button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="outline">Anterior</Button><span className="min-w-20 text-center text-xs text-stone-500">{currentPage} de {pageCount}</span><Button disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} variant="outline">Siguiente</Button></div></div>
      </section>

      <section className="mt-5 flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold">Resumen para el contribuyente</p><p className="mt-1 text-sm text-stone-500">{selectionLabel(selectedCommitments.length)} · {money.format(selectedTotal)}. La imagen usará la razón social y el RIF de la empresa activa.</p></div><Button className="h-10 bg-[#14352d] px-4 text-white hover:bg-[#0e2821]" disabled={!selectedCommitments.length} onClick={generateSummaryImage}><ImageDown /> Generar imagen resumen</Button></section>

      <PaymentDialog canManage={Boolean(data?.canManage)} date={paymentDate} error={paymentError} file={paymentFile} item={paymentTarget} onClose={() => { if (!paying) setPaymentTarget(null); }} onConfirm={confirmPayment} onDateChange={setPaymentDate} onFileChange={setPaymentFile} saving={paying} />
      <ImagePreviewDialog copyStatus={copyStatus} height={imageHeight} image={imagePreview} onClose={() => setImagePreview(null)} onCopy={copyImage} onDownload={downloadImage} />
    </div>
  );
}

function PaymentDialog({ canManage, date, error, file, item, onClose, onConfirm, onDateChange, onFileChange, saving }: { canManage: boolean; date: string; error: string; file: File | null; item: CalendarCaseView | null; onClose: () => void; onConfirm: () => Promise<void>; onDateChange: (value: string) => void; onFileChange: (file: File | null) => void; saving: boolean }) {
  const receipt = item?.evidences.find(({ kind }) => kind === "PAYMENT_RECEIPT");
  const receiptEnabled = item?.offeringKind === "SERVICE" || item?.evidenceRequirements.some(({ kind }) => kind === "PAYMENT_RECEIPT");
  return <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open={Boolean(item)}><DialogContent className="max-w-lg gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><DialogTitle>Marcar compromiso como pagado</DialogTitle><DialogDescription>Este cambio cerrará el pago en el mismo expediente que alimenta Calendario.</DialogDescription></DialogHeader><div className="min-h-0 space-y-5 overflow-y-auto p-5"><div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800"><p className="font-medium">{item?.offeringName}</p><p className="mt-1 text-sm text-stone-500">{item?.periodLabel} · {item ? money.format(amountOf(item)) : ""}</p></div><Field label="Fecha de pago"><DatePicker className="mt-1.5" disabled={saving} onValueChange={onDateChange} value={date} /></Field>{receiptEnabled && <Field label="Comprobante de la transferencia o pago"><AttachmentInput accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" aria-label="Adjuntar comprobante de pago" description="PDF, JPG o PNG · máximo 20 MB" disabled={!canManage || saving} fileName={file?.name ?? receipt?.originalName ?? ""} label={receipt ? "Reemplazar comprobante" : "Adjuntar comprobante"} onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} /><p className="mt-1.5 text-xs text-stone-500">{receipt ? "Ya existe un comprobante en el expediente. Puedes conservarlo o reemplazarlo." : "El archivo se guardará como comprobante de pago del expediente."}</p></Field>}{!receiptEnabled && <p className="rounded-lg border border-stone-200 px-3 py-2 text-xs leading-5 text-stone-500 dark:border-stone-700">Esta obligación no tiene habilitado el campo “Comprobante de pago”. Puedes activarlo en la configuración del impuesto antes de adjuntarlo.</p>}{error && <p className="flex items-start gap-2 text-sm text-rose-600"><AlertCircle className="mt-0.5 shrink-0" size={16} />{error}</p>}</div><DialogFooter className="border-t border-stone-100 px-5 py-4 dark:border-stone-800"><DialogClose render={<Button disabled={saving} variant="outline" />}>Cancelar</DialogClose><Button className="bg-[#14352d] text-white hover:bg-[#0e2821]" disabled={!canManage || !date || saving} onClick={() => void onConfirm()}>{saving ? <LoaderCircle className="animate-spin" /> : <Check />} {saving ? "Actualizando…" : "Confirmar pago"}</Button></DialogFooter></DialogContent></Dialog>;
}

function ImagePreviewDialog({ copyStatus, height, image, onClose, onCopy, onDownload }: { copyStatus: "idle" | "copied" | "error"; height: number; image: string | null; onClose: () => void; onCopy: () => void; onDownload: () => void }) {
  return <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open={Boolean(image)}><DialogContent className="max-w-3xl gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><DialogTitle>Imagen resumen lista</DialogTitle><DialogDescription>Revisa el contenido antes de compartirlo con el cliente.</DialogDescription></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto bg-stone-100 p-4 dark:bg-stone-950">{image && <img alt="Resumen de compromisos seleccionados" className="mx-auto h-auto w-full max-w-2xl rounded-lg border border-stone-200 bg-white shadow-sm" height={height} src={image} width={1200} />}</div><DialogFooter className="border-t border-stone-100 bg-white px-5 py-4 dark:border-stone-800 dark:bg-stone-900"><span aria-live="polite" className="mr-auto self-center text-xs text-rose-600">{copyStatus === "error" ? "El navegador no permitió copiar la imagen." : ""}</span><DialogClose render={<Button variant="outline" />}>Cerrar</DialogClose><Button onClick={onCopy} variant="outline"><ClipboardCopy /> {copyStatus === "copied" ? "Copiada" : "Copiar imagen"}</Button><Button className="bg-[#14352d] text-white hover:bg-[#0e2821]" onClick={onDownload}><Download /> Descargar PNG</Button></DialogFooter></DialogContent></Dialog>;
}

function SelectAllCheckbox({ checked, disabled, indeterminate, onChange }: { checked: boolean; disabled: boolean; indeterminate: boolean; onChange: (checked: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <label className="inline-flex items-center gap-2"><input aria-label="Seleccionar o desmarcar todos los compromisos pendientes filtrados" checked={checked} className="size-4 accent-[#14352d]" disabled={disabled} onClick={() => onChange(!checked)} readOnly ref={ref} type="checkbox" /><span>Todos</span></label>;
}

function StatePanel({ action, description, icon: Icon, spinning, title }: { action?: ReactNode; description: string; icon: LucideIcon; spinning?: boolean; title: string }) {
  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8"><div className="grid min-h-80 place-items-center rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900"><div><Icon className={`mx-auto text-stone-400 ${spinning ? "animate-spin" : ""}`} size={28} /><h1 className="mt-4 text-xl font-semibold">{title}</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div></div></div>;
}

function selectionLabel(count: number) { return count === 1 ? "1 compromiso seleccionado" : `${count} compromisos seleccionados`; }
function markedLabel(count: number) { return count === 1 ? "1 compromiso marcado" : `${count} compromisos marcados`; }
function Field({ children, label }: { children: ReactNode; label: string }) { return <label className="block text-sm font-medium">{label}{children}</label>; }
function Metric({ detail, icon: Icon, label, value }: { detail: string; icon: LucideIcon; label: string; value: string }) { return <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex items-center justify-between gap-3"><p className="text-sm text-stone-500">{label}</p><Icon className="text-stone-400" size={17} /></div><p className="mt-2 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div>; }
function fitCanvasText(context: CanvasRenderingContext2D, value: string, maxWidth: number) { if (context.measureText(value).width <= maxWidth) return value; let shortened = value; while (shortened.length && context.measureText(`${shortened}…`).width > maxWidth) shortened = shortened.slice(0, -1); return `${shortened}…`; }
