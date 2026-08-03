"use client";

import {
  Check,
  Download,
  ExternalLink,
  FileText,
  LayoutPanelLeft,
  LoaderCircle,
  Printer,
  Rows2,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type BoardDocument = {
  id: string;
  name: string;
  fileName: string;
  status: "AVAILABLE" | "QUARANTINED";
};
type BoardGroup = {
  id: string;
  name: string;
  cadence: string;
  kind: "TAX" | "SERVICE";
  expectedBoardDocuments: string[];
  documents: BoardDocument[];
};
type BoardData = {
  company: { id: string; legalName: string; rif: string };
  period: { key: string; label: string };
  archivePaperLabel: string;
  fiscalBoardGroups: BoardGroup[];
};
type Layout = "ONE_PER_PAGE" | "TWO_PER_PAGE";

export function FiscalBoardBuilder({
  data,
  loading,
  period,
}: {
  data: BoardData | null;
  loading: boolean;
  period: string;
}) {
  const [layout, setLayout] = useState<Layout>("ONE_PER_PAGE");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const available = useMemo(
    () =>
      data?.fiscalBoardGroups.flatMap((group) =>
        group.documents.filter(({ status }) => status === "AVAILABLE"),
      ) ?? [],
    [data],
  );
  const selected = useMemo(
    () => available.filter(({ id }) => selectedIds.has(id)),
    [available, selectedIds],
  );
  const selectedKey = selected.map(({ id }) => id).join(",");

  useEffect(() => {
    setSelectedIds(new Set(available.map(({ id }) => id)));
  }, [data?.company.id, data?.period.key, available]);

  useEffect(() => {
    const controller = new AbortController();
    if (!data || !selected.length) {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      setPreviewLoading(false);
      return () => controller.abort();
    }
    setPreviewLoading(true);
    setError("");
    const timeout = window.setTimeout(() => {
      fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode: "FISCAL_BOARD",
          companyId: data.company.id,
          period,
          evidenceIds: selected.map(({ id }) => id),
          layout,
          purpose: "preview",
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json();
            throw new Error(body.error ?? "No fue posible preparar la cartelera.");
          }
          return response.blob();
        })
        .then((blob) => {
          const next = URL.createObjectURL(blob);
          setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return next;
          });
        })
        .catch((reason: Error) => {
          if (reason.name !== "AbortError") setError(reason.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setPreviewLoading(false);
        });
    }, 450);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [data, layout, period, selected, selectedKey]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(group: BoardGroup) {
    const ids = group.documents
      .filter(({ status }) => status === "AVAILABLE")
      .map(({ id }) => id);
    const checked = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => (checked ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function download() {
    if (!data || !selected.length) return;
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "FISCAL_BOARD",
          companyId: data.company.id,
          period,
          evidenceIds: selected.map(({ id }) => id),
          layout,
          purpose: "download",
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "No fue posible generar la cartelera.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const link = document.createElement("a");
      link.href = url;
      link.download =
        disposition.match(/filename="([^"]+)"/)?.[1] ??
        "cartelera-fiscal-" + period + ".pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible generar la cartelera.",
      );
    } finally {
      setGenerating(false);
    }
  }

  if (loading)
    return (
      <Card className="mt-6 border-0 shadow-sm">
        <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
          <LoaderCircle className="animate-spin" size={18} />
          Preparando la cartelera fiscal...
        </CardContent>
      </Card>
    );

  const groups = data?.fiscalBoardGroups ?? [];
  const configuredTaxes = groups.filter(
    (group) => group.kind === "TAX" && group.expectedBoardDocuments.length,
  ).length;

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-emerald-950 dark:text-emerald-100">
            Cartelera fiscal de {data?.period.label ?? period}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-800/80 dark:text-emerald-200/70">
            Reúne sólo los soportes marcados para cartelera en cada impuesto y
            los documentos disponibles de servicios. El orden configurado en la
            firma se conserva al imprimir.
          </p>
        </div>
        <Link
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-4 text-sm font-medium shadow-xs hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
          href="/configuracion/impuestos"
        >
          <Settings2 size={15} /> Configurar documentos
        </Link>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)]">
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Presentación</h3>
                  <p className="mt-1 text-xs text-stone-500">
                    {data?.archivePaperLabel ?? "Tamaño configurado por la firma"}
                  </p>
                </div>
                <Badge variant="outline">{selected.length} documentos</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LayoutOption
                  active={layout === "ONE_PER_PAGE"}
                  description="Cada hoja del documento ocupa una página completa."
                  icon={LayoutPanelLeft}
                  label="Normal"
                  onClick={() => setLayout("ONE_PER_PAGE")}
                />
                <LayoutOption
                  active={layout === "TWO_PER_PAGE"}
                  description="Dos hojas lado a lado en una página horizontal."
                  icon={Rows2}
                  label="Dos hojas por página"
                  onClick={() => setLayout("TWO_PER_PAGE")}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="font-semibold">Impuestos y servicios del período</h3>
              <p className="mt-1 text-xs text-stone-500">
                {configuredTaxes} impuestos con cartelera configurada
              </p>
            </div>
            <Button
              disabled={!available.length}
              onClick={() =>
                setSelectedIds(
                  selected.length === available.length
                    ? new Set()
                    : new Set(available.map(({ id }) => id)),
                )
              }
              size="sm"
              variant="ghost"
            >
              {selected.length === available.length ? "Desmarcar" : "Marcar"} todo
            </Button>
          </div>

          {!groups.length ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-sm text-stone-500">
                No hay obligaciones ni servicios materializados para este período.
              </CardContent>
            </Card>
          ) : (
            groups.map((group) => (
              <BoardGroupCard
                group={group}
                key={group.id}
                onToggle={toggle}
                onToggleGroup={() => toggleGroup(group)}
                selectedIds={selectedIds}
              />
            ))
          )}
        </div>

        <Card className="sticky top-24 overflow-hidden border-0 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-3 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Vista preliminar de cartelera</h3>
              <p className="mt-1 text-xs text-stone-500">
                {layout === "ONE_PER_PAGE"
                  ? "Una hoja por página"
                  : "Dos hojas por página horizontal"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                disabled={!previewUrl}
                onClick={() =>
                  previewUrl &&
                  window.open(previewUrl, "_blank", "noopener,noreferrer")
                }
                size="sm"
                variant="outline"
              >
                <Printer size={15} /> Imprimir
              </Button>
              <Button
                className="bg-[#14352d] hover:bg-[#0e2821]"
                disabled={!selected.length || generating}
                onClick={() => void download()}
                size="sm"
              >
                {generating ? (
                  <LoaderCircle className="animate-spin" size={15} />
                ) : (
                  <Download size={15} />
                )}
                Generar PDF
              </Button>
            </div>
          </div>
          <div className="relative bg-stone-200/70 p-3 dark:bg-stone-950">
            {previewUrl ? (
              <iframe
                className="h-[760px] w-full rounded-md bg-white shadow-sm"
                src={previewUrl + "#toolbar=1&navpanes=0&view=FitH"}
                title="Vista preliminar de la cartelera fiscal"
              />
            ) : (
              <div className="grid h-[760px] place-items-center rounded-md bg-white p-8 text-center text-sm text-stone-500 shadow-sm">
                <div>
                  <FileText className="mx-auto mb-3" size={28} />
                  {selected.length
                    ? "Preparando la vista preliminar..."
                    : "Selecciona al menos un documento disponible."}
                </div>
              </div>
            )}
            {previewLoading && previewUrl && (
              <div className="absolute inset-3 grid place-items-center rounded-md bg-white/80 text-sm text-stone-600">
                <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                  <LoaderCircle className="animate-spin" size={16} />
                  Actualizando...
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function LayoutOption({
  active,
  description,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  icon: typeof LayoutPanelLeft;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        "rounded-xl border p-4 text-left transition " +
        (active
          ? "border-[#14352d] bg-emerald-50 ring-1 ring-[#14352d] dark:bg-emerald-950/20"
          : "border-stone-200 hover:border-stone-300 dark:border-stone-700")
      }
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-2 font-medium">
        <Icon size={18} /> {label}
        {active && <Check className="ml-auto text-[#14352d]" size={16} />}
      </span>
      <span className="mt-2 block text-xs leading-5 text-stone-500">
        {description}
      </span>
    </button>
  );
}

function BoardGroupCard({
  group,
  onToggle,
  onToggleGroup,
  selectedIds,
}: {
  group: BoardGroup;
  onToggle: (id: string) => void;
  onToggleGroup: () => void;
  selectedIds: Set<string>;
}) {
  const available = group.documents.filter(
    ({ status }) => status === "AVAILABLE",
  );
  const allSelected =
    available.length > 0 && available.every(({ id }) => selectedIds.has(id));
  const missing = group.expectedBoardDocuments.filter(
    (name) => !group.documents.some((document) => document.name === name),
  );
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-start gap-3 border-b border-stone-100 p-4 dark:border-stone-800">
          <button
            aria-label={(allSelected ? "Desmarcar " : "Marcar ") + group.name}
            className={
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded border " +
              (allSelected
                ? "border-[#14352d] bg-[#14352d] text-white"
                : "border-stone-300 dark:border-stone-600")
            }
            disabled={!available.length}
            onClick={onToggleGroup}
            type="button"
          >
            {allSelected && <Check size={13} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold">{group.name}</h4>
              <Badge variant="outline">
                {group.kind === "TAX" ? "Impuesto" : "Servicio"}
              </Badge>
              <span className="text-xs text-stone-400">{group.cadence}</span>
            </div>
            {!group.expectedBoardDocuments.length && group.kind === "TAX" ? (
              <p className="mt-2 text-xs text-amber-700">
                Ningún soporte está marcado para cartelera.{" "}
                <Link
                  className="font-medium underline underline-offset-2"
                  href="/configuracion/impuestos"
                >
                  Configurar <ExternalLink className="inline" size={11} />
                </Link>
              </p>
            ) : missing.length ? (
              <p className="mt-2 text-xs text-stone-500">
                Pendientes: {missing.join(", ")}
              </p>
            ) : null}
          </div>
        </div>
        {group.documents.length ? (
          group.documents.map((document) => {
            const pending = document.status === "QUARANTINED";
            return (
              <label
                className={
                  "flex items-start gap-3 border-b border-stone-100 px-4 py-3.5 last:border-0 dark:border-stone-800 " +
                  (pending ? "cursor-wait" : "cursor-pointer")
                }
                key={document.id}
              >
                <input
                  checked={selectedIds.has(document.id)}
                  className="sr-only"
                  disabled={pending}
                  onChange={() => onToggle(document.id)}
                  type="checkbox"
                />
                <span
                  className={
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded border " +
                    (selectedIds.has(document.id)
                      ? "border-[#14352d] bg-[#14352d] text-white"
                      : pending
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-stone-300 dark:border-stone-600")
                  }
                >
                  {pending ? (
                    <LoaderCircle className="animate-spin" size={12} />
                  ) : (
                    selectedIds.has(document.id) && <Check size={13} />
                  )}
                </span>
                <FileText className="mt-0.5 text-stone-400" size={17} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{document.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-stone-500">
                    {document.fileName}
                  </span>
                </span>
                {pending && <Badge variant="outline">Validando</Badge>}
              </label>
            );
          })
        ) : (
          <p className="px-4 py-5 text-sm text-stone-500">
            No hay documentos disponibles para cartelera en este período.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
