"use client";

import {
  CalendarClock,
  Check,
  FileCheck2,
  FileUp,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Settings2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AttachmentInput } from "@/components/ui/attachment-input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  FirmOffering,
  FiscalCalendar,
  FiscalCalendarMatrix,
} from "@/modules/firm/domain/catalog";

const monthlyColumns = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

export function SpecialTaxpayerCalendar() {
  const [calendar, setCalendar] = useState<FiscalCalendar | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false);
  const [configuring, setConfiguring] = useState<FiscalCalendarMatrix | null>(
    null,
  );
  const [taxOfferings, setTaxOfferings] = useState<FirmOffering[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/firm/catalog", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible cargar el calendario.");
      const loaded =
        body.calendars.find(
          (item: FiscalCalendar) =>
            item.taxpayerCondition === "SPECIAL_TAXPAYER",
        ) ?? null;
      setTaxOfferings(
        body.offerings.filter((item: FirmOffering) => item.kind === "TAX"),
      );
      setCalendar(loaded);
      setSelectedId((current) => current || loaded?.matrices[0]?.id || "");
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar el calendario.",
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const matrices = calendar?.matrices ?? [];
  const selected =
    matrices.find((matrix) => matrix.id === selectedId) ?? matrices[0];
  const visibleColumns =
    selected && editing && !selected.columns.includes("FECHA")
      ? monthlyColumns
      : (selected?.columns ?? []);
  const totalDates = useMemo(
    () =>
      matrices.reduce(
        (total, matrix) =>
          total +
          matrix.rows.reduce(
            (rowTotal, row) =>
              rowTotal + Object.values(row.dates).filter(Boolean).length,
            0,
          ),
        0,
      ),
    [matrices],
  );
  const updateDate = (rif: string, column: string, value: string) => {
    setSaved(false);
    setCalendar((current) =>
      current
        ? {
            ...current,
            matrices: current.matrices.map((matrix) =>
              matrix.id !== selected.id
                ? matrix
                : {
                    ...matrix,
                    rows: matrix.rows.map((row) =>
                      row.rif === rif
                        ? { ...row, dates: { ...row.dates, [column]: value } }
                        : row,
                    ),
                  },
            ),
          }
        : current,
    );
  };
  async function save() {
    if (!calendar || !selected) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/firm/fiscal-calendars/${calendar.id}/matrices/${selected.id}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            version: calendar.version,
            rows: selected.rows,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible guardar la matriz.");
      setCalendar(body.calendar);
      setEditing(false);
      setSaved(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la matriz.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function saveConfiguration() {
    if (!calendar || !configuring) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        configuring.id
          ? `/api/firm/fiscal-calendars/${calendar.id}/matrices/${configuring.id}`
          : `/api/firm/fiscal-calendars/${calendar.id}/matrices`,
        {
          method: configuring.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            version: calendar.version,
            label: configuring.label,
            shortLabel: configuring.shortLabel,
            cadence: configuring.cadence,
            period: configuring.period,
            note: configuring.note ?? "",
            offeringIds: configuring.offeringIds,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible guardar la matriz.");
      setCalendar(body.calendar);
      setSelectedId(body.matrixId ?? configuring.id);
      setConfiguring(null);
      setSaved(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la matriz.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (!calendar || !selected)
    return (
      <div className="grid min-h-64 place-items-center rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        {error ? (
          <p className="p-5 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        ) : (
          <LoaderCircle className="animate-spin text-stone-400" />
        )}
      </div>
    );
  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      )}
      <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/25 dark:text-violet-100">
        <div className="flex gap-3">
          <CalendarClock className="mt-0.5 shrink-0" size={19} />
          <div>
            <p className="font-semibold">
              Calendario vinculado por impuesto, vigencia y condición tributaria
            </p>
            <p className="mt-1 max-w-4xl leading-6">
              La lógica futura aplicará esta matriz solo cuando la empresa sea
              sujeto pasivo especial, tenga la obligación habilitada y la fecha
              consultada esté dentro de la vigencia del calendario. Después
              resolverá período y terminal de RIF.
            </p>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-5 dark:border-stone-800 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200">
              <FileCheck2 size={19} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{calendar.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${calendar.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}
                >
                  {calendar.active
                    ? "Activo"
                    : "Muestra · pendiente de activar"}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {calendar.sourceGazette} · publicada{" "}
                {calendar.sourcePublishedAt} · Providencia{" "}
                {calendar.sourceProvision}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Vigencia {calendar.appliesFrom} al {calendar.appliesTo} ·
                criterio SPE
              </p>
              <p className="mt-1 text-xs text-stone-400">
                {calendar.sourceNote}
              </p>
            </div>
          </div>
          <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800">
            <FileUp size={16} /> {fileName || "Adjuntar publicación"}
            <AttachmentInput
              accept="application/pdf,image/*"
              className="sr-only"
              onChange={(event) =>
                setFileName(event.target.files?.[0]?.name ?? "")
              }
            />
          </label>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Summary label="Matrices cargadas" value={String(matrices.length)} />
          <Summary label="Fechas registradas" value={String(totalDates)} />
          <Summary
            label="Criterio de asignación"
            value="Impuesto + período + terminal RIF"
            small
          />
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-5 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <label className="field-label">
              Año
              <SimpleSelect
                className="field mt-1.5"
                value={String(calendar.year)}
              >
                <option>{calendar.year}</option>
              </SimpleSelect>
            </label>
            <label className="field-label">
              Matriz por obligación y período
              <SimpleSelect
                className="field mt-1.5"
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setEditing(false);
                  setConfiguring(null);
                  setSaved(false);
                }}
                value={selected.id}
              >
                {matrices.map((matrix) => (
                  <option key={matrix.id} value={matrix.id}>
                    {matrix.label} · {matrix.shortLabel}
                  </option>
                ))}
              </SimpleSelect>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                  onClick={() => {
                    setEditing(false);
                    void load();
                  }}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50"
                  disabled={saving}
                  onClick={() => void save()}
                  type="button"
                >
                  <Save size={16} /> {saving ? "Guardando…" : "Guardar matriz"}
                </button>
              </>
            ) : (
              <>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white hover:bg-[#0e2821]"
                  onClick={() =>
                    setConfiguring({
                      id: "",
                      key: "",
                      groupId: "",
                      label: "",
                      shortLabel: "",
                      cadence: "Mensual",
                      period: String(calendar.year),
                      offeringIds: [],
                      obligations: [],
                      columns: monthlyColumns,
                      rows: Array.from({ length: 10 }, (_, terminal) => ({
                        rif: String(terminal),
                        dates: {},
                      })),
                      note: "",
                    })
                  }
                  type="button"
                >
                  <Plus size={16} /> Nueva matriz
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                  onClick={() =>
                    setConfiguring({
                      ...selected,
                      offeringIds: [...selected.offeringIds],
                    })
                  }
                  type="button"
                >
                  <Settings2 size={16} /> Configurar matriz
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                  onClick={() => setEditing(true)}
                  type="button"
                >
                  <Pencil size={16} /> Editar fechas
                </button>
              </>
            )}
          </div>
        </div>
        <MatrixHeader matrix={selected} />
        <div className="overflow-x-auto">
          <Table className="min-w-[760px] w-full text-center text-sm">
            <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/80 dark:text-stone-300">
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-24 bg-stone-50 px-4 py-3 text-left dark:bg-stone-800">
                  Terminal RIF
                </TableHead>
                {visibleColumns.map((column) => (
                  <TableHead
                    className="min-w-14 px-2 py-3 text-center"
                    key={column}
                  >
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
              {selected.rows.map((row) => (
                <TableRow key={row.rif}>
                  <TableCell className="sticky left-0 bg-white px-4 py-3 text-left font-semibold dark:bg-stone-900">
                    {row.rif}
                  </TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell
                      className="px-1.5 py-2"
                      key={`${row.rif}-${column}`}
                    >
                      {editing ? (
                        <Input
                          aria-label={`${selected.shortLabel}, RIF ${row.rif}, ${column}`}
                          className="h-8 min-w-12 px-1 text-center text-xs tabular-nums"
                          onChange={(event) =>
                            updateDate(row.rif, column, event.target.value)
                          }
                          value={row.dates[column] ?? ""}
                        />
                      ) : (
                        <span className="inline-grid min-h-8 min-w-10 place-items-center rounded-md bg-stone-50 px-2 font-medium tabular-nums dark:bg-stone-800 dark:text-stone-100">
                          {row.dates[column] || "—"}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
          <span>
            Las fechas se almacenan completas; la tabla mensual muestra solo el
            día para facilitar la revisión.
          </span>
          {saved && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
              <Check size={14} /> Matriz guardada
            </span>
          )}
        </div>
      </section>
      {configuring && (
        <MatrixConfigurationDialog
          draft={configuring}
          offerings={taxOfferings}
          onChange={setConfiguring}
          onClose={() => setConfiguring(null)}
          onSave={() => void saveConfiguration()}
          saving={saving}
        />
      )}
    </div>
  );
}

function MatrixHeader({ matrix }: { matrix: FiscalCalendarMatrix }) {
  return (
    <div className="border-b border-stone-100 bg-stone-50/60 px-5 py-4 dark:border-stone-800 dark:bg-stone-800/50">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{matrix.label}</h3>
            <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {matrix.cadence}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{matrix.period}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {matrix.obligations.map((obligation) => (
            <span
              className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
              key={obligation}
            >
              {obligation}
            </span>
          ))}
        </div>
      </div>
      {matrix.note && (
        <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
          {matrix.note}
        </p>
      )}
    </div>
  );
}

function MatrixConfigurationDialog({
  draft,
  offerings,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  draft: FiscalCalendarMatrix;
  offerings: FirmOffering[];
  onChange: (matrix: FiscalCalendarMatrix) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const creating = !draft.id;
  const toggleOffering = (offeringId: string, checked: boolean) => {
    onChange({
      ...draft,
      offeringIds: checked
        ? [...new Set([...draft.offeringIds, offeringId])]
        : draft.offeringIds.filter((id) => id !== offeringId),
    });
  };
  const valid = Boolean(
    draft.label.trim() &&
    draft.shortLabel.trim() &&
    draft.cadence.trim() &&
    draft.period.trim() &&
    draft.offeringIds.length,
  );
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800">
          <DialogTitle>
            {creating ? "Crear matriz" : "Configurar matriz"}
          </DialogTitle>
          <DialogDescription>
            {creating
              ? "Crea una matriz mensual inicial y selecciona los impuestos a los que aplica."
              : "Define cómo se identifica la matriz y a cuáles impuestos aplica."}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label sm:col-span-2">
              Nombre de la matriz
              <Input
                className="field mt-1.5"
                onChange={(event) =>
                  onChange({ ...draft, label: event.target.value })
                }
                value={draft.label}
              />
            </label>
            <label className="field-label">
              Nombre corto
              <Input
                className="field mt-1.5"
                onChange={(event) =>
                  onChange({ ...draft, shortLabel: event.target.value })
                }
                value={draft.shortLabel}
              />
            </label>
            <label className="field-label">
              Periodicidad
              <Input
                className="field mt-1.5"
                onChange={(event) =>
                  onChange({ ...draft, cadence: event.target.value })
                }
                value={draft.cadence}
              />
            </label>
            <label className="field-label sm:col-span-2">
              Período o descripción
              <Input
                className="field mt-1.5"
                onChange={(event) =>
                  onChange({ ...draft, period: event.target.value })
                }
                value={draft.period}
              />
            </label>
            <label className="field-label sm:col-span-2">
              Nota
              <Input
                className="field mt-1.5"
                onChange={(event) =>
                  onChange({ ...draft, note: event.target.value })
                }
                value={draft.note ?? ""}
              />
            </label>
          </div>
          <fieldset className="mt-5 rounded-xl border border-stone-200 p-4 dark:border-stone-700 dark:bg-stone-900/40">
            <legend className="px-1 text-sm font-semibold">
              Impuestos a los que aplica
            </legend>
            <p className="mb-3 text-xs leading-5 text-stone-500 dark:text-stone-400">
              Selecciona al menos un impuesto. Su condición de contribuyente
              seguirá controlando en qué empresas aparece.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {offerings.map((offering) => (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${draft.offeringIds.includes(offering.id) ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"}`}
                  key={offering.id}
                >
                  <input
                    checked={draft.offeringIds.includes(offering.id)}
                    className="mt-0.5 size-4 accent-[#14352d]"
                    onChange={(event) =>
                      toggleOffering(offering.id, event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-medium">{offering.name}</span>
                    <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                      {offering.active ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <DialogFooter className="border-t border-stone-100 bg-white px-5 py-4 dark:border-stone-800 dark:bg-stone-900">
          <DialogClose
            render={
              <button
                className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                type="button"
              />
            }
          >
            Cancelar
          </DialogClose>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50"
            disabled={saving || !valid}
            onClick={onSave}
            type="button"
          >
            <Save size={16} />{" "}
            {saving
              ? "Guardando…"
              : creating
                ? "Crear matriz"
                : "Guardar matriz"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Summary({
  label,
  small,
  value,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg bg-stone-50 p-3 dark:bg-stone-800/70">
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      <p className={`mt-1 font-semibold ${small ? "text-sm" : "text-xl"}`}>
        {value}
      </p>
    </div>
  );
}
