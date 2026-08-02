"use client";

import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Action = "CREATE" | "RECALCULATE" | "SUPPRESS" | "RESTORE" | "PROTECTED" | "REVIEW";
type Result = {
  applied: boolean;
  summary: Record<string, number>;
  items: Array<{
    companyName: string;
    offeringName: string;
    period: string;
    action: Action;
    reason: string;
  }>;
};

const labels: Record<Action, string> = {
  CREATE: "Crear",
  RECALCULATE: "Recalcular",
  SUPPRESS: "Retirar",
  RESTORE: "Restaurar",
  PROTECTED: "Protegida",
  REVIEW: "Revisar",
};

function currentPeriod() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export function CalendarReconciliationPanel({
  companyId,
  companyName,
  disabled = false,
  initialPeriod,
  onApplied,
}: {
  companyId?: string;
  companyName?: string;
  disabled?: boolean;
  initialPeriod?: string;
  onApplied?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [periodFrom, setPeriodFrom] = useState(currentPeriod);
  const [periodTo, setPeriodTo] = useState(currentPeriod);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialPeriod) return;
    setPeriodFrom(initialPeriod);
    setPeriodTo(initialPeriod);
    setResult(null);
  }, [initialPeriod]);

  async function run(action: "preview" | "apply") {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/calendar/reconciliation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, periodFrom, periodTo, companyId }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible conciliar el calendario.");
      setResult(body);
      if (body.applied) await onApplied?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible conciliar el calendario.");
    } finally {
      setLoading(false);
    }
  }

  const actionable = result
    ? ["create", "recalculate", "suppress", "restore"].reduce(
        (total, key) => total + (result.summary[key] ?? 0),
        0,
      )
    : 0;

  return (
    <>
      <section className="mt-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <RefreshCw size={17} /> Conciliación del calendario
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-stone-500">
              Revisa el impacto de los cambios y corrige pendientes. Las obligaciones declaradas,
              pagadas o cerradas permanecen intactas.
            </p>
            {disabled && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Guarda primero los cambios de la empresa para obtener una vista previa correcta.
              </p>
            )}
          </div>
          <Button
            disabled={disabled}
            onClick={() => {
              setResult(null);
              setError(null);
              setOpen(true);
            }}
            type="button"
            variant="outline"
          >
            <ShieldCheck size={16} /> Revisar inconsistencias
          </Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl gap-5 overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Conciliar calendario{companyName ? ` · ${companyName}` : ""}</DialogTitle>
            <DialogDescription>
              Primero se genera una vista previa. Nada cambia hasta que confirmes la aplicación.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Desde
              <Input className="mt-1.5" type="month" value={periodFrom} onChange={(event) => { setPeriodFrom(event.target.value); setResult(null); }} />
            </label>
            <label className="text-sm font-medium">
              Hasta
              <Input className="mt-1.5" type="month" value={periodTo} onChange={(event) => { setPeriodTo(event.target.value); setResult(null); }} />
            </label>
          </div>
          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>
          )}
          {result && (
            <div className="space-y-4">
              {result.applied && (
                <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                  <CheckCircle2 size={17} /> Conciliación aplicada y registrada en auditoría.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(labels) as Action[]).map((action) => (
                  <div className="rounded-lg border border-stone-200 p-3" key={action}>
                    <p className="text-xs text-stone-500">{labels[action]}</p>
                    <p className="mt-1 text-xl font-semibold">{result.summary[action.toLowerCase()] ?? 0}</p>
                  </div>
                ))}
              </div>
              {(result.summary.review ?? 0) > 0 && (
                <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 shrink-0" size={17} /> Los casos con trabajo iniciado se muestran para revisión manual y no serán alterados.
                </p>
              )}
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {result.items.length === 0 ? (
                  <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">No se encontraron inconsistencias en el rango seleccionado.</p>
                ) : result.items.map((item, index) => (
                  <div className="rounded-lg border border-stone-200 p-3 text-sm" key={`${item.companyName}-${item.offeringName}-${item.period}-${index}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.offeringName} · {item.period}</p>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium">{labels[item.action]}</span>
                    </div>
                    {!companyId && <p className="mt-1 text-xs text-stone-500">{item.companyName}</p>}
                    <p className="mt-1 text-xs leading-5 text-stone-600">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button disabled={loading || !periodFrom || !periodTo} onClick={() => void run("preview")} type="button" variant="outline">
              {loading ? "Procesando…" : "Generar vista previa"}
            </Button>
            {result && !result.applied && actionable > 0 && (
              <Button className="bg-[#14352d]" disabled={loading} onClick={() => void run("apply")} type="button">
                Aplicar {actionable} cambios seguros
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
