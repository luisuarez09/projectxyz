"use client";

import {
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  FileImage,
  FileText,
  Filter,
  LoaderCircle,
  RotateCcw,
  Save,
  UploadCloud,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SimpleSelect } from "@/components/ui/simple-select";
import { evidenceLabel } from "@/lib/evidence-requirements";
import type {
  CalendarCaseView,
  CalendarEvidenceView,
  CalendarView,
  CalendarViewMode,
  ComplianceActivityMode,
  ComplianceCaseStatus,
  DeadlineStatus,
} from "@/modules/calendar/domain/calendar";

type DeadlineFilter = "ALL" | DeadlineStatus;

const statusLabels: Record<ComplianceCaseStatus, string> = {
  PENDING: "Pendiente",
  PREPARING: "En preparación",
  READY_FOR_REVIEW: "Lista para revisión",
  SUBMITTED: "Declarada",
  PAID: "Pagada",
  CLOSED: "Cerrada",
  INCIDENT: "Con incidencia",
  NOT_APPLICABLE: "No aplica",
};

const deadlineLabels: Record<DeadlineStatus, string> = {
  OVERDUE: "Vencida",
  DUE_SOON: "Por vencer",
  ON_TRACK: "Al día",
  NO_DUE_DATE: "Sin fecha",
};

const deadlineStyle: Record<DeadlineStatus, string> = {
  OVERDUE: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
  DUE_SOON: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  ON_TRACK: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  NO_DUE_DATE: "border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400",
};

const workStyle: Record<ComplianceCaseStatus, string> = {
  PENDING: "text-stone-500",
  PREPARING: "text-sky-600 dark:text-sky-300",
  READY_FOR_REVIEW: "text-violet-600 dark:text-violet-300",
  SUBMITTED: "text-emerald-600 dark:text-emerald-300",
  PAID: "text-emerald-700 dark:text-emerald-200",
  CLOSED: "text-emerald-700 dark:text-emerald-200",
  INCIDENT: "text-rose-600 dark:text-rose-300",
  NOT_APPLICABLE: "text-stone-400",
};

function currentPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find(({ type }) => type === "year")?.value;
  const month = parts.find(({ type }) => type === "month")?.value;
  return `${year}-${month}`;
}

function formatDate(value: string) {
  if (!value) return "Por determinar";
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function FiscalCalendar({ initialPeriod, initialView = "due" }: { initialPeriod?: string; initialView?: CalendarViewMode }) {
  const [period, setPeriod] = useState(() => initialPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(initialPeriod) ? initialPeriod : currentPeriod());
  const [viewMode, setViewMode] = useState<CalendarViewMode>(initialView);
  const [companyId, setCompanyId] = useState("all");
  const [data, setData] = useState<CalendarView | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<DeadlineFilter>("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<"bottom" | "right">("bottom");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/calendar?period=${period}&companyId=${companyId}&view=${viewMode}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible cargar el calendario.");
      const nextData = body as CalendarView;
      setData(nextData);
      setSelectedId((current) =>
        nextData.cases.some(({ id }) => id === current)
          ? current
          : (nextData.cases[0]?.id ?? ""),
      );
      setError(null);
      setSavedMessage("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible cargar el calendario.");
    } finally {
      setLoading(false);
    }
  }, [companyId, period, viewMode]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const tablet = window.matchMedia("(min-width: 640px)");
    const closeDrawerOnDesktop = () => {
      if (desktop.matches) setDrawerOpen(false);
    };
    const updateDrawerSide = () => setDrawerSide(tablet.matches ? "right" : "bottom");
    updateDrawerSide();
    desktop.addEventListener("change", closeDrawerOnDesktop);
    tablet.addEventListener("change", updateDrawerSide);
    return () => {
      desktop.removeEventListener("change", closeDrawerOnDesktop);
      tablet.removeEventListener("change", updateDrawerSide);
    };
  }, []);

  const selected = data?.cases.find(({ id }) => id === selectedId) ?? null;
  const visible = useMemo(
    () => (data?.cases ?? []).filter((item) =>
      filter === "ALL" || item.deadlineStatus === filter,
    ),
    [data, filter],
  );
  const overdue = (data?.cases ?? []).filter(({ deadlineStatus }) => deadlineStatus === "OVERDUE").length;
  const dueSoon = (data?.cases ?? []).filter(({ deadlineStatus }) => deadlineStatus === "DUE_SOON").length;
  const completed = (data?.cases ?? []).filter(({ status }) =>
    ["SUBMITTED", "PAID", "CLOSED", "NOT_APPLICABLE"].includes(status),
  ).length;
  const total = data?.cases.length ?? 0;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  function updateSelected(values: Partial<CalendarCaseView>) {
    setSavedMessage("");
    setData((current) => current ? {
      ...current,
      cases: current.cases.map((item) =>
        item.id === selectedId ? { ...item, ...values } : item,
      ),
    } : current);
  }

  async function saveSelected() {
    if (!selected || !data?.canManage) return;
    setSaving(true);
    try {
      const status = selected.offeringKind === "TAX" && selected.status === "PENDING" && selected.filedAt
        ? "SUBMITTED"
        : selected.status;
      const response = await fetch(`/api/calendar/${selected.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: selected.version,
          status,
          activityMode: selected.activityMode,
          filedAt: selected.filedAt,
          amount: selected.amount,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible guardar el expediente.");
      const savedCase = body.case as CalendarCaseView;
      setData((current) => current ? {
        ...current,
        cases: current.cases.map((item) => item.id === savedCase.id ? savedCase : item),
      } : current);
      setSavedMessage(`Guardado como ${statusLabels[savedCase.status].toLowerCase()}.`);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible guardar el expediente.");
    } finally {
      setSaving(false);
    }
  }

  async function resetSelected() {
    if (!selected || !data?.canReset) return;
    setResetting(true);
    setError(null);
    try {
      const response = await fetch(`/api/calendar/${selected.id}/reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: selected.version }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible restablecer el expediente.");
      const resetCase = body.case as CalendarCaseView;
      setData((current) => current ? {
        ...current,
        cases: current.cases.map((item) => item.id === resetCase.id ? resetCase : item),
      } : current);
      setSavedMessage(
        body.cleanupPending
          ? `Expediente restablecido; ${body.cleanupPending} archivo(s) quedaron pendientes de limpieza técnica.`
          : "Expediente restablecido y soportes eliminados.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible restablecer el expediente.");
    } finally {
      setResetting(false);
    }
  }

  function open(id: string) {
    setSelectedId(id);
    setSavedMessage("");
    if (!window.matchMedia("(min-width: 1280px)").matches) setDrawerOpen(true);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="mb-2 text-sm text-stone-500">{viewMode === "due" ? "Mes de vencimiento" : "Período de imposición"}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Calendario</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            {viewMode === "due"
              ? "Consulta qué debe declararse o pagarse durante el mes, aunque corresponda a un período de imposición anterior."
              : "Consulta los expedientes que pertenecen al período de imposición seleccionado, independientemente de cuándo vencen."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SimpleSelect
            aria-label="Filtrar por empresa"
            className="h-9 min-w-64"
            onValueChange={setCompanyId}
            value={companyId}
          >
            <option value="all">Todas las empresas</option>
            {(data?.companies ?? []).map((company) => (
              <option key={company.id} value={company.id}>{company.legalName}</option>
            ))}
          </SimpleSelect>
          <div className="flex items-center gap-2">
            <Button onClick={() => data && setPeriod(data.period.previous)} size="sm" variant="outline"><ChevronLeft /> Mes anterior</Button>
            <Button onClick={() => data && setPeriod(data.period.next)} size="sm" variant="outline"><span className="capitalize">{data?.period.label ?? period}</span><ChevronRight /></Button>
          </div>
        </div>
      </div>

      <div className="mt-5 inline-flex rounded-xl border border-stone-200 bg-white p-1 shadow-sm dark:border-stone-800 dark:bg-stone-900" aria-label="Forma de consultar el calendario">
        <ViewModeButton active={viewMode === "due"} label="Por vencimiento" onClick={() => setViewMode("due")} />
        <ViewModeButton active={viewMode === "period"} label="Por período de imposición" onClick={() => setViewMode("period")} />
      </div>

      {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div>}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CircleAlert} label="Requieren gestión" value={String(overdue + dueSoon)} detail={`${overdue} vencidas · ${dueSoon} próximas`} color="rose" />
        <Metric icon={Clock3} label="Vencen en 7 días" value={String(dueSoon)} detail={companyId === "all" ? "En toda la firma" : "Empresa seleccionada"} color="amber" />
        <Metric icon={FileCheck2} label="Completadas" value={String(completed)} detail={`${progress}% de la vista`} color="emerald" />
        <Metric icon={WalletCards} label="Expedientes" value={String(total)} detail="Generados desde configuración" color="sky" />
      </div>

      <Card className="mt-6 border-0 shadow-sm">
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium">{viewMode === "due" ? "Avance de los vencimientos" : "Avance del período"}</p><p className="mt-0.5 text-xs text-stone-500">{completed} de {total} obligaciones completadas</p></div>
            <span className="text-xs font-medium text-stone-500">{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </CardContent>
      </Card>

      <div className="mt-6 xl:grid xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-6">
        <section>
          <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter size={17} className="text-stone-500" />
              <div className="flex gap-1 overflow-x-auto">
                <Chip active={filter === "ALL"} label="Todas" onClick={() => setFilter("ALL")} />
                {(Object.keys(deadlineLabels) as DeadlineStatus[]).map((item) => <Chip active={filter === item} key={item} label={deadlineLabels[item]} onClick={() => setFilter(item)} />)}
              </div>
            </div>
            <Link className="text-sm font-medium text-[#14352d] hover:underline dark:text-emerald-300" href={`/calendario/matriz?period=${period}`}>Matriz de vencimientos</Link>
          </div>
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-stone-100 dark:border-stone-800">
              <CardTitle>{viewMode === "due" ? "Vencimientos del mes" : "Obligaciones del período"}</CardTitle>
              <CardDescription>{viewMode === "due" ? "Ordenados por fecha tope; cada expediente conserva su período de imposición." : "Período de imposición, fecha tope y estado guardado por expediente."}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <LoadingState /> : visible.length ? (
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {visible.map((item) => (
                    <button className={`grid w-full gap-3 p-4 text-left transition sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center ${selectedId === item.id ? "bg-[#f1f7f2] dark:bg-emerald-950/40" : "hover:bg-stone-50 dark:hover:bg-stone-800/60"}`} key={item.id} onClick={() => open(item.id)} type="button">
                      <div className="grid size-10 place-items-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300"><CalendarDays size={18} /></div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.companyName}</p>
                        <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{item.offeringName} <span className="text-stone-400">· {item.periodLabel}</span></p>
                        <p className="mt-1 text-xs text-stone-500">{item.offeringKind === "TAX" ? "Impuesto" : "Servicio"} · {item.cadence}{item.regime === "SPE" ? " · SPE" : ""}</p>
                        <p className={`mt-1 text-xs font-medium ${workStyle[item.status]}`}>Trabajo: {statusLabels[item.status]}</p>
                      </div>
                      <div className="text-left sm:text-right"><p className="text-xs text-stone-500">Fecha tope</p><p className="mt-0.5 text-sm font-medium">{formatDate(item.dueDate)}</p><p className="mt-1 max-w-52 text-xs text-stone-500">{item.deadlineBasis}</p></div>
                      <Badge className={`${deadlineStyle[item.deadlineStatus]} justify-self-start sm:justify-self-end`} variant="outline">{deadlineLabels[item.deadlineStatus]}</Badge>
                    </button>
                  ))}
                </div>
              ) : <EmptyState />}
            </CardContent>
          </Card>
        </section>
        <aside className="sticky top-22 hidden rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 xl:block">
          {selected ? <ComplianceForm canManage={Boolean(data?.canManage)} canReset={Boolean(data?.canReset)} item={selected} onReset={resetSelected} onSave={saveSelected} onUpdate={updateSelected} resetting={resetting} savedMessage={savedMessage} saving={saving} /> : <SelectionState />}
        </aside>
      </div>

      <Sheet open={drawerOpen && Boolean(selected)} onOpenChange={setDrawerOpen}>
        {selected && (
          <SheetContent
            className={drawerSide === "right" ? "w-full gap-0 overflow-y-auto p-5 sm:w-105 sm:max-w-none sm:rounded-none sm:rounded-l-2xl xl:hidden" : "max-h-[90vh] w-full gap-0 overflow-y-auto rounded-t-2xl p-5 xl:hidden"}
            side={drawerSide}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Expediente del período</SheetTitle>
              <SheetDescription>Consulta y actualiza el expediente de la obligación seleccionada.</SheetDescription>
            </SheetHeader>
            <ComplianceForm
              canManage={Boolean(data?.canManage)}
              canReset={Boolean(data?.canReset)}
              item={selected}
              onReset={resetSelected}
              onSave={saveSelected}
              onUpdate={updateSelected}
              resetting={resetting}
              savedMessage={savedMessage}
              saving={saving}
            />
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}

function ComplianceForm({ canManage, canReset, item, onUpdate, onReset, onSave, resetting, savedMessage, saving }: { canManage: boolean; canReset: boolean; item: CalendarCaseView; onUpdate: (values: Partial<CalendarCaseView>) => void; onReset: () => Promise<void>; onSave: () => Promise<void>; resetting: boolean; savedMessage: string; saving: boolean }) {
  const informative = item.activityMode === "WITHOUT_ACTIVITY";
  const evidenceFields: Array<{ kind: CalendarEvidenceView["kind"]; label: string; required?: boolean }> = item.offeringKind === "TAX"
    ? item.evidenceRequirements.map((requirement) => ({
        ...requirement,
        label: evidenceLabel(requirement.kind),
      }))
    : [
        { kind: "INVOICE", label: "Factura o documento" },
        { kind: "PAYMENT_RECEIPT", label: "Comprobante de pago", required: item.status === "PAID" },
      ];
  const hasResettableContent =
    item.status !== "PENDING" ||
    item.activityMode !== null ||
    Boolean(item.filedAt || item.paidAt || item.amount || item.evidences.length);
  return <>
    <div className="pr-8"><p className="text-xs font-medium uppercase tracking-wide text-stone-500">Expediente del período</p><h2 className="mt-1 text-base font-semibold">{item.offeringName}</h2><p className="mt-1 text-sm text-stone-500">{item.companyName}</p><div className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300"><p className="font-semibold">{item.periodLabel} · {item.cadence}</p><p className="mt-1">{item.deadlineBasis}</p><p className="mt-1 text-stone-500">Fecha tope: {formatDate(item.dueDate)}</p></div></div>
    <div className="mt-5 space-y-4">
      <Field label="Estado del trabajo"><SimpleSelect className="field" disabled={!canManage} onValueChange={(status) => onUpdate({ status: status as ComplianceCaseStatus })} value={item.status}>{(Object.keys(statusLabels) as ComplianceCaseStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</SimpleSelect></Field>
      {item.offeringKind === "TAX" && <Field label="Tipo de declaración"><div className="grid grid-cols-2 gap-2"><Choice active={!informative} disabled={!canManage} label="Con actividad" onClick={() => onUpdate({ activityMode: "WITH_ACTIVITY" as ComplianceActivityMode })} /><Choice active={informative} disabled={!canManage} label="Sin actividad" onClick={() => onUpdate({ activityMode: "WITHOUT_ACTIVITY" as ComplianceActivityMode, amount: "" })} /></div></Field>}
      <Field label={item.offeringKind === "TAX" ? "Fecha declarada" : "Fecha registrada"}><DatePicker className="field" disabled={!canManage} onValueChange={(filedAt) => onUpdate({ filedAt })} value={item.filedAt} /></Field>
      {!informative && <Field label="Monto"><Input className="field" disabled={!canManage} inputMode="decimal" onChange={(event) => onUpdate({ amount: event.target.value })} placeholder="0,00" value={item.amount} /></Field>}
      <div className="space-y-2">
        <div><p className="text-xs font-medium text-stone-600 dark:text-stone-300">Soportes del expediente</p><p className="mt-1 text-xs leading-5 text-stone-500">Solo aparecen los soportes habilitados para este impuesto. El asterisco identifica los obligatorios.</p></div>
        {evidenceFields.map((field) => (
          <EvidenceUploader
            canManage={canManage}
            evidence={item.evidences.find(({ kind }) => kind === field.kind)}
            itemId={item.id}
            key={field.kind}
            kind={field.kind}
            label={`${field.label}${field.required ? " *" : ""}`}
            onSaved={(evidence) => onUpdate({ evidences: [...item.evidences.filter(({ kind }) => kind !== evidence.kind), evidence] })}
          />
        ))}
      </div>
    </div>
    <Button className="mt-5 w-full bg-[#14352d] hover:bg-[#0e2821]" disabled={!canManage || saving} onClick={() => void onSave()}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />} {saving ? "Guardando…" : "Guardar expediente"}</Button>
    {canReset && hasResettableContent && (
      <ResetCaseButton
        documentCount={item.evidences.length}
        disabled={resetting || saving}
        onConfirm={onReset}
      />
    )}
    {savedMessage && <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"><Check size={15} /> {savedMessage}</p>}
    {!canManage && <p className="mt-3 text-xs text-stone-500">Tu rol permite consultar, pero no modificar este expediente.</p>}
  </>;
}

function ResetCaseButton({
  disabled,
  documentCount,
  onConfirm,
}: {
  disabled: boolean;
  documentCount: number;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function confirm() {
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        className="mt-2 w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
        disabled={disabled}
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <RotateCcw /> Revertir expediente
      </Button>
      <DialogContent className="max-w-md gap-5 p-6">
        <DialogHeader className="pr-8">
          <DialogTitle>¿Revertir este expediente?</DialogTitle>
          <DialogDescription>
            Volverá al estado pendiente y se eliminarán los datos cargados para comenzar nuevamente.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
          {documentCount
            ? `Se eliminarán permanentemente ${documentCount} archivo(s) del almacenamiento privado. Esta acción quedará registrada en auditoría.`
            : "Se borrarán el estado, tipo de declaración, fechas y monto registrados. Esta acción quedará registrada en auditoría."}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button
            className="bg-rose-600 text-white hover:bg-rose-700"
            disabled={confirming}
            onClick={() => void confirm()}
            type="button"
          >
            {confirming ? <LoaderCircle className="animate-spin" /> : <RotateCcw />}
            {confirming ? "Restableciendo…" : "Sí, revertir expediente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceUploader({ canManage, evidence, itemId, kind, label, onSaved }: { canManage: boolean; evidence?: CalendarEvidenceView; itemId: string; kind: CalendarEvidenceView["kind"]; label: string; onSaved: (evidence: CalendarEvidenceView) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "done" | "error">(evidence ? "done" : "idle");
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (requestRef.current) return;
    setPhase(evidence ? "done" : "idle");
    setProgress(0);
    setUploadError("");
  }, [evidence?.id]);

  async function upload(file?: File) {
    if (!file) return;
    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (!allowedTypes.has(file.type)) {
      setPhase("error");
      setUploadError("Usa un archivo PDF, JPG o PNG.");
      return;
    }
    if (!file.size || file.size > 20 * 1024 * 1024) {
      setPhase("error");
      setUploadError("El archivo debe pesar menos de 20 MB.");
      return;
    }
    setPhase("uploading");
    setProgress(0);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("file", file);
      const savedEvidence = await new Promise<CalendarEvidenceView>((resolve, reject) => {
        const request = new XMLHttpRequest();
        requestRef.current = request;
        request.open("POST", `/api/calendar/${itemId}/evidence`);
        request.responseType = "json";
        request.upload.onprogress = (event) => {
          if (event.lengthComputable)
            setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        };
        request.upload.onload = () => {
          setProgress(100);
          setPhase("processing");
        };
        request.onerror = () => reject(new Error("Se interrumpió la conexión durante la carga."));
        request.onabort = () => reject(new Error("La carga fue cancelada."));
        request.onload = () => {
          const body = request.response ?? {};
          if (request.status < 200 || request.status >= 300)
            reject(new Error(body.error ?? "No fue posible cargar el soporte."));
          else resolve(body.evidence as CalendarEvidenceView);
        };
        request.send(formData);
      });
      onSaved(savedEvidence);
      setPhase("done");
    } catch (reason) {
      setPhase("error");
      setUploadError(reason instanceof Error ? reason.message : "No fue posible cargar el soporte.");
    } finally {
      requestRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = phase === "uploading" || phase === "processing";
  const description = phase === "uploading"
    ? `Subiendo al expediente · ${progress}%`
    : phase === "processing"
      ? "Carga completa · guardando en el almacenamiento privado"
      : uploadError
        ? uploadError
        : evidence
          ? evidence.status === "AVAILABLE"
            ? "Disponible en el expediente"
            : evidence.status === "REJECTED"
              ? "Archivo rechazado"
              : "Guardado en S3 · pendiente de análisis"
          : "Arrastra aquí un PDF, JPG o PNG · máximo 20 MB";

  return <div>
    <input
      accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
      aria-label={label}
      className="sr-only"
      disabled={!canManage || busy}
      onChange={(event) => void upload(event.target.files?.[0])}
      ref={inputRef}
      type="file"
    />
    <Attachment
      className={`w-full min-w-0 ${dragging ? "border-[#14352d] bg-emerald-50/70 dark:bg-emerald-950/30" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (canManage && !busy) setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (canManage && !busy) event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (canManage && !busy) void upload(event.dataTransfer.files[0]);
      }}
      state={phase}
    >
      <AttachmentMedia>
        {phase === "uploading" || phase === "processing"
          ? <UploadCloud />
          : evidence?.originalName.toLowerCase().endsWith(".pdf")
            ? <FileText />
            : evidence
              ? <FileImage />
              : <UploadCloud />}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{evidence?.originalName ?? label}</AttachmentTitle>
        <AttachmentDescription>{description}</AttachmentDescription>
      </AttachmentContent>
      {canManage && !busy && (
        <AttachmentTrigger
          aria-label={`${evidence ? "Reemplazar" : "Adjuntar"} ${label.toLowerCase()}`}
          onClick={() => inputRef.current?.click()}
        />
      )}
      {busy && (
        <div className="basis-full px-2.5 pb-2.5" aria-label={`Progreso de carga ${progress}%`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${phase === "processing" ? "animate-pulse bg-emerald-500" : "bg-[#14352d]"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </Attachment>
  </div>;
}

function LoadingState() { return <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-stone-500"><LoaderCircle className="animate-spin" size={18} /> Cargando expedientes…</div>; }
function EmptyState() { return <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center"><Building2 className="text-stone-400" size={26} /><p className="mt-3 font-medium">No hay obligaciones para este período</p><p className="mt-1 max-w-md text-sm text-stone-500">Revisa los impuestos y servicios habilitados en la configuración de cada empresa.</p></div>; }
function SelectionState() { return <div className="flex min-h-56 flex-col items-center justify-center text-center"><CalendarDays className="text-stone-400" size={25} /><p className="mt-3 text-sm font-medium">Selecciona una obligación</p><p className="mt-1 text-xs text-stone-500">Aquí podrás actualizar su expediente.</p></div>; }
function Choice({ active, disabled, label, onClick }: { active: boolean; disabled: boolean; label: string; onClick: () => void }) { return <button className={`rounded-lg border px-2 py-2 text-sm font-medium disabled:opacity-50 ${active ? "border-[#14352d] bg-[#e7f0e9] text-[#14352d] dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100" : "border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300"}`} disabled={disabled} onClick={onClick} type="button">{label}</button>; }
function Metric({ icon: Icon, label, value, detail, color }: { icon: typeof CalendarDays; label: string; value: string; detail: string; color: "rose" | "amber" | "emerald" | "sky" }) { const colors = { rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300", emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300", sky: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300" }; return <Card className="border-0 shadow-sm"><CardContent className="flex items-start justify-between pt-4"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div><div className={`grid size-9 place-items-center rounded-lg ${colors[color]}`}><Icon size={18} /></div></CardContent></Card>; }
function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${active ? "bg-[#14352d] text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-700 dark:hover:bg-stone-800"}`} onClick={onClick} type="button">{label}</button>; }
function ViewModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button aria-pressed={active} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-[#14352d] text-white shadow-sm" : "text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"}`} onClick={onClick} type="button">{label}</button>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-xs font-medium text-stone-600 dark:text-stone-300"><span className="mb-1.5 block">{label}</span>{children}</label>; }
