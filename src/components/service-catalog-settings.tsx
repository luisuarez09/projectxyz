"use client";

import {
  CalendarDays,
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DeadlineRuleFields } from "@/components/deadline-rule-fields";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  emptyDeadlineRule,
  formatDeadlineRule,
  isDeadlineConfigured,
} from "@/lib/deadline-rules";
import type { FirmOffering } from "@/modules/firm/domain/catalog";

const emptyService: FirmOffering = {
  id: "",
  version: 1,
  key: "",
  kind: "SERVICE",
  taxpayerCondition: "ALL",
  name: "",
  organism: "",
  frequency: "Según factura",
  speFrequency: "No aplica",
  speCalendarGroup: "",
  deadline: { ...emptyDeadlineRule },
  template: "none",
  source: "",
  appliesFrom: "",
  appliesTo: "",
  active: true,
};

export function ServiceCatalogSettings() {
  const [rules, setRules] = useState<FirmOffering[]>([]);
  const [draft, setDraft] = useState<FirmOffering | null>(null);
  const [removing, setRemoving] = useState<FirmOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/firm/catalog", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible cargar los servicios.");
      setRules(
        body.offerings.filter((item: FirmOffering) => item.kind === "SERVICE"),
      );
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar los servicios.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function persist(rule: FirmOffering) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        rule.id ? `/api/firm/offerings/${rule.id}` : "/api/firm/offerings",
        {
          method: rule.id ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(rule),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible guardar el servicio.");
      setRules((items) =>
        rule.id
          ? items.map((item) => (item.id === rule.id ? body.offering : item))
          : [...items, body.offering],
      );
      setDraft(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar el servicio.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/firm/offerings/${removing.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible eliminar el servicio.");
      setRules((items) => items.filter((item) => item.id !== removing.id));
      setRemoving(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible eliminar el servicio.",
      );
      setRemoving(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Configuración de la firma</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Servicios
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            Solo los servicios habilitados estarán disponibles en el alta y la
            configuración de cada empresa.
          </p>
        </div>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white hover:bg-[#0e2821]"
          onClick={() =>
            setDraft({ ...emptyService, deadline: { ...emptyDeadlineRule } })
          }
          type="button"
        >
          <Plus size={16} /> Crear servicio
        </button>
      </div>
      {error && (
        <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      )}
      <section className="mt-5 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-100">
        <p className="font-semibold">
          Reglas persistidas para alimentar el calendario
        </p>
        <p className="mt-1 leading-5">
          Cantidad, tipo de día y punto de partida se almacenan por separado.
          Los servicios facturados pueden tomar la fecha indicada por el
          prestador.
        </p>
      </section>
      <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="border-b border-stone-100 p-5 dark:border-stone-800">
          <h2 className="font-semibold">Reglas disponibles</h2>
          <p className="mt-1 text-sm text-stone-500">
            {loading
              ? "Cargando catálogo…"
              : `${rules.length} servicios registrados`}
          </p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="grid min-h-48 place-items-center">
              <LoaderCircle className="animate-spin text-stone-400" />
            </div>
          ) : (
            <Table className="min-w-[760px] w-full text-left text-sm">
              <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70">
                <TableRow>
                  <TableHead className="px-5 py-3">Tipo de servicio</TableHead>
                  <TableHead className="px-3 py-3">Organismo</TableHead>
                  <TableHead className="px-3 py-3">
                    Cálculo del vencimiento
                  </TableHead>
                  <TableHead className="px-3 py-3">Estado</TableHead>
                  <TableHead className="px-5 py-3" />
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="px-5 py-4 font-medium">
                      {rule.name}
                    </TableCell>
                    <TableCell className="px-3 py-4">{rule.organism}</TableCell>
                    <TableCell className="px-3 py-4">
                      <span className="inline-flex items-start gap-1.5">
                        <CalendarDays
                          size={15}
                          className="mt-0.5 shrink-0 text-stone-400"
                        />
                        {formatDeadlineRule(rule.deadline)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          aria-label={`${rule.active ? "Deshabilitar" : "Habilitar"} ${rule.name}`}
                          checked={rule.active}
                          disabled={saving}
                          onCheckedChange={(checked) =>
                            void persist({ ...rule, active: checked })
                          }
                          size="sm"
                        />
                        <span
                          className={`text-xs font-medium ${rule.active ? "text-emerald-700" : "text-stone-500"}`}
                        >
                          {rule.active ? "Habilitado" : "Deshabilitado"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          aria-label={`Editar ${rule.name}`}
                          className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100"
                          onClick={() =>
                            setDraft({
                              ...rule,
                              deadline: { ...rule.deadline },
                            })
                          }
                          type="button"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label={`Eliminar ${rule.name}`}
                          className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => setRemoving(rule)}
                          type="button"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
      {draft && (
        <RuleForm
          draft={draft}
          saving={saving}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={() => void persist(draft)}
        />
      )}
      {removing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4">
          <section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900">
            <h2 className="text-lg font-semibold">¿Eliminar servicio?</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Eliminarás{" "}
              <span className="font-medium text-stone-800 dark:text-stone-200">
                {removing.name}
              </span>
              . Si ya tiene relaciones, el sistema te pedirá deshabilitarlo para
              conservar trazabilidad.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600"
                onClick={() => setRemoving(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="h-9 rounded-lg bg-rose-600 px-3 text-sm font-medium text-white"
                disabled={saving}
                onClick={() => void remove()}
                type="button"
              >
                Eliminar servicio
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function RuleForm({
  draft,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  draft: FirmOffering;
  onChange: (value: FirmOffering) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-stone-950/35 p-4">
      <section className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900">
        <h2 className="text-lg font-semibold">
          {draft.id ? "Editar servicio" : "Crear servicio"}
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          La regla producirá la fecha tope que verán el calendario y los
          compromisos.
        </p>
        <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-700 dark:bg-stone-800/50">
          <div>
            <p className="text-sm font-semibold">Servicio habilitado</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Al habilitarlo estará disponible para asignarlo a las empresas.
            </p>
          </div>
          <Switch
            aria-label="Habilitar servicio"
            checked={draft.active}
            onCheckedChange={(checked) =>
              onChange({ ...draft, active: checked })
            }
          />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="field-label">
            Tipo de servicio
            <Input
              className="field mt-1.5"
              onChange={(event) =>
                onChange({ ...draft, name: event.target.value })
              }
              placeholder="Ej. Electricidad"
              value={draft.name}
            />
          </label>
          <label className="field-label">
            Organismo
            <Input
              className="field mt-1.5"
              onChange={(event) =>
                onChange({ ...draft, organism: event.target.value })
              }
              placeholder="Ej. Prestador eléctrico"
              value={draft.organism}
            />
          </label>
          <DeadlineRuleFields
            allowDocumentDate
            onChange={(deadline) => onChange({ ...draft, deadline })}
            value={draft.deadline}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50"
            disabled={
              saving ||
              !draft.name ||
              !draft.organism ||
              !isDeadlineConfigured(draft.deadline)
            }
            onClick={onSave}
            type="button"
          >
            <Check size={16} /> {saving ? "Guardando…" : "Guardar regla"}
          </button>
        </div>
      </section>
    </div>
  );
}
