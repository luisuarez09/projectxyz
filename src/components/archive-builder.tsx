"use client";

import {
  Archive,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileOutput,
  FileText,
  Info,
  Layers3,
  LoaderCircle,
  Printer,
  Search,
  Tags,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { useCompanyContext } from "@/components/company-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";

type Tab = "consolidado" | "portada";
type ArchiveDocument = {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  origin: string;
  status: "AVAILABLE" | "QUARANTINED";
};
type DocumentGroup = {
  id: string;
  name: string;
  cadence: string;
  kind: "TAX" | "SERVICE";
  documents: ArchiveDocument[];
  archiveOrder: number;
};
type ArchiveResponse = {
  period: { key: string; label: string };
  company: { id: string; legalName: string; rif: string };
  companies: { id: string; legalName: string; rif: string }[];
  groups: DocumentGroup[];
  archivePaperSize: "LETTER" | "A4" | "LEGAL_OFFICIO";
  archivePaperLabel: string;
};
type SelectedDocument = ArchiveDocument & { group: string; groupId: string };

const periodFormatter = new Intl.DateTimeFormat("es-VE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function periodOptions() {
  const now = new Date();
  return Array.from({ length: 18 }, (_, offset) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    const key = date.toISOString().slice(0, 7);
    const rawLabel = periodFormatter.format(date);
    return { key, label: rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1) };
  });
}

const periods = periodOptions();
const ArchivePdfPreview = dynamic(
  () =>
    import("@/components/archive-pdf-preview").then(
      (module) => module.ArchivePdfPreview,
    ),
  { ssr: false },
);

export function ArchiveBuilder() {
  const { activeCompanyId, loading: companyLoading } = useCompanyContext();
  const [tab, setTab] = useState<Tab>("consolidado");
  const [period, setPeriod] = useState(periods[1]?.key ?? periods[0].key);
  const [data, setData] = useState<ArchiveResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [includeIndex, setIncludeIndex] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [error, setError] = useState("");
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [title, setTitle] = useState("ARCHIVO TRIBUTARIO Y DE SERVICIOS");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (companyLoading) return;
    if (!activeCompanyId) {
      setData(null);
      setSelectedIds(new Set());
      setError("Selecciona una empresa activa para consultar el archivo.");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({ period });
    setLoading(true);
    setError("");
    fetch(`/api/archive?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "No fue posible consultar el archivo.");
        return body as ArchiveResponse;
      })
      .then((body) => {
        setData(body);
        setSelectedIds(
          new Set(
            body.groups.flatMap((group) =>
              group.documents
                .filter((document) => document.status === "AVAILABLE")
                .map((document) => document.id),
            ),
          ),
        );
      })
      .catch((requestError: Error) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [activeCompanyId, companyLoading, period]);

  const allDocuments = useMemo(
    () =>
      data?.groups.flatMap((group) =>
        group.documents.map((document) => ({
          ...document,
          group: group.name,
          groupId: group.id,
        })),
      ) ?? [],
    [data],
  );
  const selectedDocuments = useMemo(
    () => allDocuments.filter((document) => selectedIds.has(document.id)),
    [allDocuments, selectedIds],
  );
  const availableDocuments = useMemo(
    () => allDocuments.filter((document) => document.status === "AVAILABLE"),
    [allDocuments],
  );
  const pendingDocuments = useMemo(
    () => allDocuments.filter((document) => document.status === "QUARANTINED"),
    [allDocuments],
  );
  const selectedGroups = useMemo(
    () =>
      data?.groups.filter((group) =>
        group.documents.some((document) => selectedIds.has(document.id)),
      ) ?? [],
    [data, selectedIds],
  );
  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data?.groups ?? [];
    return (data?.groups ?? []).filter((group) =>
      `${group.name} ${group.documents.map((document) => `${document.name} ${document.fileName} ${document.origin}`).join(" ")}`
        .toLowerCase()
        .includes(query),
    );
  }, [data, search]);
  const allSelected =
    availableDocuments.length > 0 &&
    selectedDocuments.length === availableDocuments.length;
  const labelDescription =
    description ||
    selectedGroups.map((group) => group.name).join(" · ") ||
    "Sin contenido seleccionado";
  const selectedEvidenceKey = selectedDocuments
    .map((document) => document.id)
    .join(",");
  const sourceCount = new Set(allDocuments.map((document) => document.origin))
    .size;

  useEffect(() => {
    const controller = new AbortController();
    const company = data?.company;

    if (!company || !selectedDocuments.length) {
      setPreviewUrl(null);
      setPreviewBlob(null);
      setPreviewLoading(false);
      setPreviewError("");
      return () => controller.abort();
    }

    setPreviewLoading(true);
    setPreviewError("");
    const timeout = window.setTimeout(() => {
      fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          companyId: company.id,
          period,
          evidenceIds: selectedDocuments.map((document) => document.id),
          title,
          description: labelDescription,
          includeIndex,
          purpose: "preview",
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json();
            throw new Error(
              body.error ?? "No fue posible preparar la vista preliminar.",
            );
          }
          return response.blob();
        })
        .then((blob) => {
          const nextUrl = URL.createObjectURL(blob);
          setPreviewBlob(blob);
          setPreviewUrl((currentUrl) => {
            if (currentUrl) URL.revokeObjectURL(currentUrl);
            return nextUrl;
          });
        })
        .catch((requestError: Error) => {
          if (requestError.name !== "AbortError")
            setPreviewError(requestError.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setPreviewLoading(false);
        });
    }, 600);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    data?.company,
    includeIndex,
    labelDescription,
    period,
    selectedEvidenceKey,
    selectedDocuments,
    title,
  ]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function toggleDocument(documentId: string) {
    if (!availableDocuments.some((document) => document.id === documentId))
      return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      return next;
    });
  }

  function toggleGroup(group: DocumentGroup) {
    const available = group.documents.filter(
      (document) => document.status === "AVAILABLE",
    );
    setSelectedIds((current) => {
      const next = new Set(current);
      const groupSelected =
        available.length > 0 &&
        available.every((document) => next.has(document.id));
      available.forEach((document) =>
        groupSelected ? next.delete(document.id) : next.add(document.id),
      );
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(
      allSelected
        ? new Set()
        : new Set(availableDocuments.map((document) => document.id)),
    );
  }

  async function generatePdf(
    documents: SelectedDocument[] = selectedDocuments,
  ) {
    if (!data || !documents.length) return;
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: data.company.id,
          period,
          evidenceIds: documents.map((document) => document.id),
          title,
          description: labelDescription,
          includeIndex,
          purpose: "download",
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "No fue posible generar el PDF.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const fileName =
        disposition.match(/filename="([^"]+)"/)?.[1] ??
        `expediente-${period}.pdf`;
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible generar el PDF.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function printLabel() {
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => window.print()),
    );
  }

  async function printPdf() {
    if (!previewUrl || !previewBlob) return;
    const file = new File([previewBlob], `expediente-${period}.pdf`, {
      type: "application/pdf",
    });

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Expediente ${periodLabel}`,
        });
        return;
      }
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === "AbortError"
      )
        return;
    }

    const opened = window.open(previewUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      const link = document.createElement("a");
      link.href = previewUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }
  }

  const company = data?.company;
  const periodLabel =
    data?.period.label ??
    periods.find((item) => item.key === period)?.label ??
    period;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm text-stone-500">Entregables de la firma</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Archivo físico
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            Consolida por período de imposición los archivos disponibles de las
            obligaciones y servicios habilitados para la empresa.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <span className="sr-only">Período de imposición</span>
            <CalendarDays
              className="pointer-events-none absolute left-3 top-2.5 text-stone-400"
              size={16}
            />
            <SimpleSelect
              className="field min-w-44 pl-9"
              onChange={(event) => setPeriod(event.target.value)}
              value={period}
            >
              {periods.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </SimpleSelect>
          </label>
        </div>
      </div>

      <nav
        className="mt-7 flex gap-6 overflow-x-auto border-b border-stone-200 text-sm dark:border-stone-800"
        aria-label="Secciones de archivo"
      >
        <TabButton
          active={tab === "consolidado"}
          icon={Archive}
          label="Consolidado por período"
          onClick={() => setTab("consolidado")}
        />
        <TabButton
          active={tab === "portada"}
          icon={Tags}
          label="Portada y etiqueta"
          onClick={() => setTab("portada")}
        />
      </nav>

      {error && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      )}

      {tab === "consolidado" && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Summary
              label="Archivos disponibles"
              value={String(availableDocuments.length)}
              detail={
                pendingDocuments.length
                  ? `${pendingDocuments.length} en validación de seguridad`
                  : `${selectedDocuments.length} seleccionados`
              }
              icon={FileText}
              tone="emerald"
            />
            <Summary
              label="Secciones"
              value={String(data?.groups.length ?? 0)}
              detail="Impuestos y servicios con archivos"
              icon={Layers3}
              tone="blue"
            />
            <Summary
              label="Fuentes"
              value={String(sourceCount)}
              detail="Calendario y expedientes"
              icon={Archive}
              tone="stone"
            />
            <Summary
              label="Páginas finales"
              value="Auto"
              detail={
                data?.archivePaperLabel ?? "Según configuración de la firma"
              }
              icon={FileOutput}
              tone="amber"
            />
          </div>

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(440px,0.88fr)]">
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Search
                        className="pointer-events-none absolute left-3 top-2.5 text-stone-400"
                        size={16}
                      />
                      <Input
                        className="field pl-9"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar obligación, archivo o procedencia..."
                        value={search}
                      />
                    </div>
                    <Button
                      className="shrink-0"
                      disabled={!allDocuments.length}
                      onClick={toggleAll}
                      variant="outline"
                    >
                      {allSelected ? (
                        <>
                          <span className="size-3.5 rounded-sm border border-stone-400" />{" "}
                          Desmarcar todos
                        </>
                      ) : (
                        <>
                          <Check size={15} /> Marcar todos
                        </>
                      )}
                    </Button>
                  </div>
                  <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
                    <input
                      checked={includeIndex}
                      className="size-4 accent-[#14352d]"
                      onChange={(event) =>
                        setIncludeIndex(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>Incluir índice del expediente</span>
                  </label>
                </CardContent>
              </Card>
              {loading ? (
                <LoadingState />
              ) : (
                visibleGroups.map((group, index) => (
                  <DocumentGroupCard
                    group={group}
                    key={group.id}
                    onGenerate={(groupId) =>
                      generatePdf(
                        selectedDocuments.filter(
                          (document) => document.groupId === groupId,
                        ),
                      )
                    }
                    onToggleDocument={toggleDocument}
                    onToggleGroup={toggleGroup}
                    selectedIds={selectedIds}
                    tone={index % 5}
                  />
                ))
              )}
              {!loading && !visibleGroups.length && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-14 text-center">
                    <Archive className="mx-auto text-stone-300" size={28} />
                    <p className="mt-3 font-medium">No hay archivos cargados</p>
                    <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-stone-500">
                      Cuando se adjunte un soporte en el calendario o expediente
                      de una obligación habilitada, aparecerá aquí.
                    </p>
                  </CardContent>
                </Card>
              )}
              <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
                <Info className="mt-0.5 shrink-0" size={18} />
                <p className="leading-6">
                  <strong>Contenido controlado:</strong> la lista no muestra
                  casillas vacías ni servicios deshabilitados. El PDF se arma en
                  el tamaño configurado por la firma, con portada, el índice
                  cuando se solicita y los archivos según el orden de archivo.
                </p>
              </div>
            </div>

            <PreviewPanel
              documents={selectedDocuments}
              expanded={previewExpanded}
              generating={generating}
              includeIndex={includeIndex}
              paperLabel={data?.archivePaperLabel ?? "Carta (8,5 × 11 pulg.)"}
              onClose={() => setPreviewExpanded(false)}
              onExpand={() => setPreviewExpanded(true)}
              onGenerate={() => generatePdf()}
              onPrint={printPdf}
              previewError={previewError}
              previewLoading={previewLoading}
              previewUrl={previewUrl}
            />
          </div>
        </>
      )}

      {tab === "portada" && (
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(440px,1.08fr)]">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Identificación del expediente
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Los cambios actualizan de inmediato la portada del PDF y la
                  etiqueta física.
                </p>
              </div>
              <div className="mt-6 grid gap-4">
                <label className="text-sm font-medium">
                  Nombre legal
                  <Input
                    className="field mt-1.5"
                    readOnly
                    value={company?.legalName ?? ""}
                  />
                </label>
                <label className="text-sm font-medium">
                  RIF
                  <Input
                    className="field mt-1.5"
                    readOnly
                    value={company?.rif ?? ""}
                  />
                </label>
                <label className="text-sm font-medium">
                  Título del expediente
                  <Input
                    className="field mt-1.5"
                    maxLength={80}
                    onChange={(event) => setTitle(event.target.value)}
                    value={title}
                  />
                </label>
                <label className="text-sm font-medium">
                  Descripción
                  <textarea
                    className="field mt-1.5 min-h-28 py-2"
                    maxLength={320}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={selectedGroups
                      .map((group) => group.name)
                      .join(" · ")}
                    value={description}
                  />
                </label>
                <label className="text-sm font-medium">
                  Período de imposición
                  <Input
                    className="field mt-1.5"
                    readOnly
                    value={periodLabel}
                  />
                </label>
              </div>
              <div className="mt-5 flex gap-3 rounded-xl bg-stone-50 p-4 text-xs leading-5 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <Tags className="mt-0.5 shrink-0" size={17} />
                <p>
                  Si la descripción queda vacía, se completa con las secciones
                  seleccionadas. Esta edición no cambia ni duplica los archivos
                  originales.
                </p>
              </div>
            </CardContent>
          </Card>
          <LabelPreview
            company={company}
            description={labelDescription}
            onPrint={printLabel}
            period={periodLabel}
            title={title}
          />
        </div>
      )}

      <div
        className="hidden"
        id="archive-print-root"
        data-print-mode="etiqueta"
      >
        <div className="archive-label-preview">
          <PrintableLabel
            company={company}
            description={labelDescription}
            period={periodLabel}
            title={title}
          />
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center justify-center gap-3 py-14 text-sm text-stone-500">
        <LoaderCircle className="animate-spin" size={18} /> Consultando archivos
        disponibles...
      </CardContent>
    </Card>
  );
}

function DocumentGroupCard({
  group,
  onGenerate,
  onToggleDocument,
  onToggleGroup,
  selectedIds,
  tone,
}: {
  group: DocumentGroup;
  onGenerate: (groupId: string) => void;
  onToggleDocument: (documentId: string) => void;
  onToggleGroup: (group: DocumentGroup) => void;
  selectedIds: Set<string>;
  tone: number;
}) {
  const available = group.documents.filter(
    (document) => document.status === "AVAILABLE",
  );
  const pending = group.documents.length - available.length;
  const selected = available.filter((document) => selectedIds.has(document.id));
  const allSelected =
    available.length > 0 && selected.length === available.length;
  const colors = [
    "bg-emerald-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
  ];
  return (
    <details className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <button
          aria-label={`${allSelected ? "Desmarcar" : "Marcar"} todos los archivos de ${group.name}`}
          className={`grid size-5 shrink-0 place-items-center rounded border disabled:cursor-not-allowed disabled:opacity-40 ${allSelected ? "border-[#14352d] bg-[#14352d] text-white" : selected.length ? "border-[#14352d] bg-emerald-50 text-[#14352d]" : "border-stone-300 dark:border-stone-600"}`}
          disabled={!available.length}
          onClick={(event) => {
            event.preventDefault();
            onToggleGroup(group);
          }}
          type="button"
        >
          {allSelected ? (
            <Check size={13} />
          ) : selected.length ? (
            <span className="h-0.5 w-2.5 bg-current" />
          ) : null}
        </button>
        <span className={`size-2.5 rounded-full ${colors[tone]}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{group.name}</h2>
            <span className="text-xs text-stone-400">{group.cadence}</span>
            {pending > 0 && (
              <Badge
                className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                variant="outline"
              >
                {pending} en validación
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-stone-500">
            {selected.length} de {available.length} archivos disponibles
            seleccionados
          </p>
        </div>
        <Button
          disabled={!selected.length}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onGenerate(group.id);
          }}
          size="sm"
          variant="outline"
        >
          <Download size={14} />{" "}
          <span className="hidden sm:inline">PDF de sección</span>
        </Button>
        <ChevronDown
          className="text-stone-400 transition-transform group-open:rotate-180"
          size={17}
        />
      </summary>
      <div className="border-t border-stone-100 px-4 dark:border-stone-800">
        {group.documents.map((document) => {
          const isPending = document.status === "QUARANTINED";
          return (
            <label
              className={`flex items-start gap-3 border-b border-stone-100 py-3.5 last:border-0 dark:border-stone-800 ${isPending ? "cursor-wait" : "cursor-pointer"}`}
              key={document.id}
            >
              <input
                checked={selectedIds.has(document.id)}
                className="sr-only"
                disabled={isPending}
                onChange={() => onToggleDocument(document.id)}
                type="checkbox"
              />
              <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border ${isPending ? "border-amber-300 bg-amber-50 text-amber-600" : selectedIds.has(document.id) ? "border-[#14352d] bg-[#14352d] text-white" : "border-stone-300 dark:border-stone-600"}`}
              >
                {isPending ? (
                  <LoaderCircle className="animate-spin" size={12} />
                ) : (
                  selectedIds.has(document.id) && <Check size={13} />
                )}
              </span>
              <FileText className="mt-0.5 shrink-0 text-stone-400" size={17} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {document.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-stone-500">
                  {document.fileName}
                </span>
              </span>
              <span className="hidden shrink-0 text-right sm:block">
                <Badge
                  className={
                    isPending
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                      : "border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  }
                  variant="outline"
                >
                  {isPending ? "Validando seguridad" : document.origin}
                </Badge>
                <span className="mt-1 block text-[11px] text-stone-400">
                  {formatBytes(document.sizeBytes)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </details>
  );
}

function PreviewPanel({
  documents,
  expanded,
  generating,
  includeIndex,
  paperLabel,
  onClose,
  onExpand,
  onGenerate,
  onPrint,
  previewError,
  previewLoading,
  previewUrl,
}: {
  documents: SelectedDocument[];
  expanded: boolean;
  generating: boolean;
  includeIndex: boolean;
  paperLabel: string;
  onClose: () => void;
  onExpand: () => void;
  onGenerate: () => void;
  onPrint: () => void;
  previewError: string;
  previewLoading: boolean;
  previewUrl: string | null;
}) {
  const [useNativeDesktopViewer, setUseNativeDesktopViewer] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateViewer = () => setUseNativeDesktopViewer(mediaQuery.matches);
    updateViewer();
    mediaQuery.addEventListener("change", updateViewer);
    return () => mediaQuery.removeEventListener("change", updateViewer);
  }, []);

  return (
    <aside
      className={`${expanded ? "fixed inset-0 z-50 overflow-y-auto bg-stone-100 p-4 dark:bg-stone-950 sm:p-8" : "sticky top-24"}`}
    >
      <Card
        className={`overflow-hidden border-0 shadow-sm ${expanded ? "mx-auto max-w-5xl" : ""}`}
      >
        <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-3 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Vista preliminar</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              PDF completo · {paperLabel} · Índice{" "}
              {includeIndex ? "incluido" : "omitido"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={expanded ? onClose : onExpand}
              size="sm"
              variant="ghost"
            >
              <Eye size={15} /> {expanded ? "Cerrar" : "Ampliar"}
            </Button>
            <Button
              className="lg:hidden"
              disabled={!previewUrl || previewLoading}
              onClick={onPrint}
              size="sm"
              variant="outline"
            >
              <Printer size={15} /> Abrir / imprimir
            </Button>
            <Button
              className="bg-[#14352d] hover:bg-[#0e2821]"
              disabled={!documents.length || generating}
              onClick={onGenerate}
              size="sm"
            >
              {generating ? (
                <LoaderCircle className="animate-spin" size={15} />
              ) : (
                <Download size={15} />
              )}{" "}
              {generating ? "Generando..." : "Generar PDF"}
            </Button>
          </div>
        </div>
        <div className="relative bg-stone-200/70 p-3 dark:bg-stone-950">
          {previewUrl && documents.length ? (
            <div
              className={`overflow-hidden rounded-md bg-white shadow-sm ${expanded ? "h-[calc(100vh-10rem)] min-h-[640px]" : "h-[760px]"}`}
            >
              {useNativeDesktopViewer ? (
                <iframe
                  className="h-full w-full bg-white"
                  src={`${previewUrl}#toolbar=1&navpanes=0&view=FitH`}
                  title="Vista preliminar del expediente PDF"
                />
              ) : (
                <ArchivePdfPreview expanded={expanded} file={previewUrl} />
              )}
            </div>
          ) : (
            <div
              className={`grid place-items-center rounded-md bg-white p-8 text-center text-sm text-stone-500 shadow-sm ${expanded ? "h-[calc(100vh-10rem)] min-h-[640px]" : "h-[760px]"}`}
            >
              {previewError ? (
                <div className="max-w-md text-rose-700">
                  <FileOutput className="mx-auto mb-3" size={28} />
                  {previewError}
                </div>
              ) : documents.length ? (
                <div>
                  <LoaderCircle
                    className="mx-auto mb-3 animate-spin"
                    size={24}
                  />
                  Preparando el PDF completo...
                </div>
              ) : (
                "Selecciona al menos un archivo para construir la vista preliminar."
              )}
            </div>
          )}
          {previewLoading && previewUrl && (
            <div className="absolute inset-3 grid place-items-center rounded-md bg-white/80 text-sm text-stone-600 backdrop-blur-[1px]">
              <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                <LoaderCircle className="animate-spin" size={16} />
                Actualizando vista preliminar...
              </span>
            </div>
          )}
        </div>
      </Card>
    </aside>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-lg bg-[#14352d] text-sm font-bold text-white">
        PX
      </span>
      <div>
        <p className="text-sm font-bold">proyectoxyz</p>
        <p className="text-[10px] uppercase tracking-widest text-stone-500">
          Firma contable
        </p>
      </div>
    </div>
  );
}

function LabelPreview({
  company,
  description,
  onPrint,
  period,
  title,
}: {
  company?: ArchiveResponse["company"];
  description: string;
  onPrint: () => void;
  period: string;
  title: string;
}) {
  return (
    <Card className="sticky top-24 overflow-hidden border-0 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 dark:border-stone-800">
        <div>
          <h2 className="font-semibold">Vista de portada y etiqueta</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            La misma identificación se aplica al expediente PDF
          </p>
        </div>
        <Button
          className="bg-[#14352d] hover:bg-[#0e2821]"
          onClick={onPrint}
          size="sm"
        >
          <Printer size={15} /> Imprimir etiqueta
        </Button>
      </div>
      <div className="bg-stone-200/70 p-5 dark:bg-stone-950">
        <div className="mx-auto aspect-[8.5/11] max-w-2xl bg-white p-[8%] text-stone-900 shadow-sm">
          <div className="flex h-full flex-col border border-dashed border-stone-400 p-[8%]">
            <div className="flex items-center justify-between border-b-4 border-[#14352d] pb-5">
              <Brand />
              <span className="text-xs font-semibold uppercase text-[#2f715f]">
                Carpeta física
              </span>
            </div>
            <div className="my-auto text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {title}
              </p>
              <h3 className="mx-auto mt-6 max-w-xl text-3xl font-bold leading-tight">
                {company?.legalName ?? "Empresa"}
              </h3>
              <p className="mt-3 text-lg font-semibold">
                RIF {company?.rif ?? "—"}
              </p>
              <div className="mx-auto my-7 h-px max-w-md bg-stone-200" />
              <p className="text-2xl font-bold text-[#14352d]">{period}</p>
              <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-stone-600">
                {description}
              </p>
            </div>
            <div className="border-t border-stone-200 pt-4 text-center text-[10px] uppercase tracking-wider text-stone-400">
              Documentación entregada al contribuyente
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PrintableLabel({
  company,
  description,
  period,
  title,
}: {
  company?: ArchiveResponse["company"];
  description: string;
  period: string;
  title: string;
}) {
  return (
    <div className="archive-preview-page h-[11in] w-[8.5in] bg-white p-[0.65in] text-stone-900">
      <div className="flex h-full flex-col border border-dashed border-stone-400 p-[0.65in]">
        <div className="flex items-center justify-between border-b-4 border-[#14352d] pb-5">
          <Brand />
          <span className="text-xs font-semibold uppercase text-[#2f715f]">
            Carpeta física
          </span>
        </div>
        <div className="my-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            {title}
          </p>
          <h3 className="mt-6 text-3xl font-bold">
            {company?.legalName ?? "Empresa"}
          </h3>
          <p className="mt-3 text-lg font-semibold">
            RIF {company?.rif ?? "—"}
          </p>
          <div className="mx-auto my-7 h-px max-w-md bg-stone-200" />
          <p className="text-2xl font-bold text-[#14352d]">{period}</p>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-stone-600">
            {description}
          </p>
        </div>
        <div className="border-t border-stone-200 pt-4 text-center text-[10px] uppercase tracking-wider text-stone-400">
          Documentación entregada al contribuyente
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Archive;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-1 pb-3 ${active ? "border-[#14352d] font-medium text-[#14352d] dark:border-emerald-300 dark:text-emerald-200" : "border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"}`}
      onClick={onClick}
      type="button"
    >
      <Icon size={16} /> {label}
    </button>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Archive;
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "blue" | "stone" | "amber";
}) {
  const colors = {
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
    blue: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300",
    stone: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  };
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-start justify-between pt-4">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-stone-500">{detail}</p>
        </div>
        <span
          className={`grid size-9 place-items-center rounded-lg ${colors[tone]}`}
        >
          <Icon size={18} />
        </span>
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
