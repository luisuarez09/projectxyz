"use client";

import {
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  FileText,
  LoaderCircle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCompanyContext } from "@/components/company-context";
import { AttachmentInput } from "@/components/ui/attachment-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CalendarCaseView,
  CalendarView,
} from "@/modules/calendar/domain/calendar";

const money = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "VES",
  minimumFractionDigits: 2,
});

function currentPeriod() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function caracasToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (kind: Intl.DateTimeFormatPartTypes) =>
    parts.find(({ type }) => type === kind)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function formatDate(value: string) {
  if (!value) return "Sin fecha calculada";
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function isRegistered(item: CalendarCaseView) {
  return Boolean(item.amount || item.evidences.length);
}

function isPaid(item: CalendarCaseView) {
  return item.status === "PAID" || item.status === "CLOSED";
}

export function MunicipalServicesRegister() {
  const { activeCompany, loading: companyLoading, offerings } = useCompanyContext();
  const [calendar, setCalendar] = useState<CalendarView | null>(null);
  const [period, setPeriod] = useState(currentPeriod);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [serviceKey, setServiceKey] = useState("");
  const [amount, setAmount] = useState("");
  const [registeredAt, setRegisteredAt] = useState(caracasToday);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeServices = useMemo(() => {
    if (!activeCompany) return [];
    const enabled = new Set(activeCompany.serviceOfferingKeys);
    return offerings.filter(
      (offering) => offering.kind === "SERVICE" && enabled.has(offering.id),
    );
  }, [activeCompany, offerings]);

  async function loadCalendar() {
    if (!activeCompany) {
      setCalendar(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        period,
        companyId: activeCompany.id,
        view: "period",
      });
      const response = await fetch(`/api/calendar?${query}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible cargar los servicios.");
      setCalendar(body);
    } catch (reason) {
      setCalendar(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar los servicios.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCalendar();
  }, [activeCompany?.id, period]);

  useEffect(() => {
    if (!activeServices.some(({ id }) => id === serviceKey))
      setServiceKey(activeServices[0]?.id ?? "");
  }, [activeServices, serviceKey]);

  const cases = useMemo(
    () =>
      (calendar?.cases ?? []).filter(
        (item) =>
          item.offeringKind === "SERVICE" && item.companyId === activeCompany?.id,
      ),
    [activeCompany?.id, calendar],
  );
  const items = cases.filter(isRegistered);
  const pending = items.filter((item) => !isPaid(item));
  const selectedService = activeServices.find(({ id }) => id === serviceKey);
  const selectedCase = calendar?.period.key === period
    ? cases.find(({ offeringKey }) => offeringKey === serviceKey)
    : undefined;

  function resetForm() {
    setAmount("");
    setRegisteredAt(caracasToday());
    setFile(null);
    setError(null);
  }

  async function registerService() {
    if (!selectedCase || !amount || !file || !registeredAt || saving) return;
    setSaving(true);
    setError(null);
    try {
      const evidence = new FormData();
      evidence.set("kind", "INVOICE");
      evidence.set("file", file);
      const evidenceResponse = await fetch(
        `/api/calendar/${selectedCase.id}/evidence`,
        { method: "POST", body: evidence },
      );
      const evidenceBody = await evidenceResponse.json();
      if (!evidenceResponse.ok)
        throw new Error(
          evidenceBody.error ?? "No fue posible adjuntar el documento.",
        );

      const response = await fetch(`/api/calendar/${selectedCase.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: selectedCase.version,
          status: "SUBMITTED",
          activityMode: null,
          filedAt: registeredAt,
          amount,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible registrar el servicio.");

      await loadCalendar();
      setOpen(false);
      resetForm();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible registrar el servicio.",
      );
    } finally {
      setSaving(false);
    }
  }

  const canRegister = Boolean(
    calendar?.canManage && activeServices.length,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-stone-500">Empresa activa / Servicios</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Servicios y solvencias
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            Registra el monto indicado en la factura u otro documento y conserva
            el soporte dentro del expediente de la empresa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            href="/servicios/estatus"
          >
            <CalendarDays size={16} /> Estatus de servicios
          </Link>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={companyLoading || loading || !canRegister}
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            type="button"
          >
            <Plus size={16} /> Registrar servicio
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric
          detail="Para solicitar transferencia"
          label="Pendientes de pago"
          value={String(pending.length)}
        />
        <Metric
          detail="Registros cargados"
          label="Monto pendiente"
          value={money.format(
            pending.reduce((total, item) => total + Number(item.amount || 0), 0),
          )}
        />
        <Metric
          detail="Documentos vigentes en expediente"
          label="Solvencias vigentes"
          value={String(
            items.filter(
              (item) =>
                item.offeringName.toLocaleLowerCase("es").includes("solvencia") &&
                isPaid(item),
            ).length,
          )}
        />
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold">Servicios de la empresa</h2>
            <p className="mt-1 text-sm text-stone-500">
              {activeCompany
                ? `${activeCompany.legalName} · período ${period}`
                : "Selecciona una empresa para consultar sus servicios."}
            </p>
          </div>
          <label className="w-full text-sm font-medium sm:w-44">
            Consultar período
            <Input
              className="field mt-1.5"
              onChange={(event) => setPeriod(event.target.value || currentPeriod())}
              type="month"
              value={period}
            />
          </label>
        </div>
        {error && !open ? (
          <p className="p-5 text-sm text-red-600">{error}</p>
        ) : loading || companyLoading ? (
          <div className="flex items-center gap-2 p-5 text-sm text-stone-500">
            <LoaderCircle className="animate-spin" size={16} /> Cargando servicios…
          </div>
        ) : !activeCompany ? (
          <p className="p-5 text-sm text-stone-500">
            Selecciona una empresa activa para continuar.
          </p>
        ) : !activeServices.length ? (
          <p className="p-5 text-sm text-stone-500">
            Esta empresa no tiene servicios activos. Puedes habilitarlos desde su
            configuración.
          </p>
        ) : !items.length ? (
          <p className="p-5 text-sm text-stone-500">
            Aún no hay servicios registrados en este período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1050px] w-full text-left text-sm">
              <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70">
                <TableRow>
                  <TableHead className="px-5 py-3">Servicio / período</TableHead>
                  <TableHead className="px-3 py-3">Documento</TableHead>
                  <TableHead className="px-3 py-3">Registrada</TableHead>
                  <TableHead className="px-3 py-3">Fecha tope</TableHead>
                  <TableHead className="px-3 py-3 text-right">Monto</TableHead>
                  <TableHead className="px-3 py-3">Soporte</TableHead>
                  <TableHead className="px-5 py-3">Estatus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
                {items.map((item) => {
                  const invoice = item.evidences.find(({ kind }) => kind === "INVOICE");
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="px-5 py-4">
                        <p className="font-medium">{item.offeringName}</p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {item.periodLabel} · {item.organism}
                        </p>
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        {invoice?.originalName ?? "Documento adjunto"}
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        {item.filedAt ? formatDate(item.filedAt) : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        <p className="font-medium">{formatDate(item.dueDate)}</p>
                        <p className="mt-1 max-w-56 text-xs text-stone-500">
                          {item.deadlineBasis}
                        </p>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-right font-medium">
                        {money.format(Number(item.amount || 0))}
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        {invoice ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CircleCheck size={14} /> Adjunto
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700">Pendiente</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isPaid(item)
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isPaid(item)
                            ? "Pagado"
                            : item.status === "SUBMITTED"
                              ? "Declarada · pendiente de pago"
                              : "Pendiente de pago"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
        open={open}
      >
        <DialogContent>
          <div className="overflow-y-auto p-6">
            <DialogHeader className="pr-8">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200">
                  <FileText size={19} />
                </div>
                <div>
                  <DialogTitle>Registrar servicio</DialogTitle>
                  <DialogDescription className="mt-1">
                    El registro quedará pendiente de pago dentro del expediente
                    del período seleccionado.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Tipo
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(event) => setServiceKey(event.target.value)}
                  value={serviceKey}
                >
                  {activeServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </SimpleSelect>
              </label>
              <label className="text-sm font-medium">
                Período del servicio
                <Input
                  className="field mt-1.5"
                  onChange={(event) => setPeriod(event.target.value || currentPeriod())}
                  type="month"
                  value={period}
                />
              </label>
              <div className="text-sm font-medium sm:col-span-2">
                Organismo aplicado
                <div className="mt-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-normal text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  {selectedService?.organism ?? "—"}
                </div>
              </div>
              <label className="text-sm font-medium">
                Fecha registrada
                <DatePicker
                  className="field mt-1.5"
                  onChange={(event) => setRegisteredAt(event.target.value)}
                  value={registeredAt}
                />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Monto indicado en el documento
                <Input
                  className="field mt-1.5"
                  min="0.01"
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0,00"
                  step="0.01"
                  type="number"
                  value={amount}
                />
              </label>
              <div className="sm:col-span-2">
                <AttachmentInput
                  accept="application/pdf,image/jpeg,image/png"
                  description="PDF, JPG o PNG · máximo 20 MB"
                  fileName={file?.name}
                  label="Adjuntar factura u otro documento"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {!selectedCase && serviceKey ? (
              <p className="mt-4 text-sm text-amber-700">
                {loading
                  ? "Buscando el expediente del período seleccionado…"
                  : "Este servicio no genera un expediente en el período seleccionado según su frecuencia configurada."}
              </p>
            ) : null}
            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

            <DialogFooter className="mt-6">
              <button
                className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                disabled={saving}
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedCase || !amount || !file || !registeredAt || saving}
                onClick={() => void registerService()}
                type="button"
              >
                {saving ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <CalendarPlus size={16} />
                )}
                {saving ? "Registrando…" : "Registrar"}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}
