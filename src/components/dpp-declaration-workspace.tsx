"use client";;
import { AttachmentInput } from "@/components/ui/attachment-input";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Landmark,
  Printer,
  Save,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type DragEvent } from "react";

import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from "@/components/ui/table";

type Employee = {
  id: string;
  identity: string;
  name: string;
  startedAt: string;
};

type AttachmentId = "declaration" | "certificate" | "paymentForm" | "transfer";

type AttachmentDefinition = {
  id: AttachmentId;
  label: string;
  detail: string;
  accept: string;
};

const employees: Employee[] = [
  {
    id: "wilmer",
    identity: "V249223080",
    name: "Wilmer Alexander Chavez Lopez",
    startedAt: "2019-12-10",
  },
  {
    id: "alexander",
    identity: "V170967280",
    name: "Alexander Jose Pirela Valbuena",
    startedAt: "2025-09-24",
  },
  {
    id: "cristina",
    identity: "V303931054",
    name: "Cristina Eduardo Ortega Flores",
    startedAt: "2025-09-24",
  },
  {
    id: "hendri",
    identity: "V317977110",
    name: "Hendri Jose Ortiz Garcia",
    startedAt: "2025-12-10",
  },
];

const attachments: AttachmentDefinition[] = [
  {
    id: "declaration",
    label: "Declaración DPP",
    detail: "Forma 99019 emitida por SENIAT.",
    accept: ".pdf",
  },
  {
    id: "certificate",
    label: "Certificado",
    detail: "Certificado o constancia asociada a la declaración.",
    accept: ".pdf,image/*",
  },
  {
    id: "paymentForm",
    label: "Planilla de pago",
    detail: "Compromiso o planilla para pagar al Tesoro Nacional.",
    accept: ".pdf",
  },
  {
    id: "transfer",
    label: "Transferencia de pago",
    detail: "Comprobante bancario de la transferencia.",
    accept: ".pdf,image/*",
  },
];

const numberVe = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const rateVe = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 5,
  maximumFractionDigits: 5,
});

const dateVe = new Intl.DateTimeFormat("es-VE");

function bolivars(value: number) {
  return `Bs. ${numberVe.format(Math.abs(value) < 0.005 ? 0 : value)}`;
}

function dollars(value: number) {
  return `$ ${numberVe.format(value)}`;
}

function parseDecimal(value: string) {
  const normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return Number.NaN;
  return Number(normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function AttachmentDropzone({
  definition,
  file,
  onChange,
}: {
  definition: AttachmentDefinition;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const receiveDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    onChange(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <label
      className={`group flex min-h-40 cursor-pointer flex-col justify-between rounded-xl border border-dashed p-4 transition ${
        dragging
          ? "border-[#14352d] bg-[#e7f0e9] dark:border-emerald-400 dark:bg-emerald-950/40"
          : file
            ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"
            : "border-stone-300 bg-stone-50/50 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900/40 dark:hover:bg-stone-800"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={receiveDrop}
    >
      <AttachmentInput
        accept={definition.accept}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold">{definition.label}</span>
          <span className="mt-1 block text-xs leading-5 text-stone-500">{definition.detail}</span>
        </span>
        {file ? (
          <CheckCircle2 className="shrink-0 text-emerald-600" size={19} />
        ) : (
          <Upload className="shrink-0 text-stone-400 group-hover:text-[#14352d]" size={19} />
        )}
      </span>
      <span className="mt-5 block">
        <span className={`block truncate text-xs font-medium ${file ? "text-emerald-700 dark:text-emerald-300" : "text-stone-600 dark:text-stone-300"}`}>
          {file?.name ?? "Arrastra el archivo o haz clic para buscar"}
        </span>
        <span className="mt-1 block text-[11px] text-stone-400">PDF{definition.accept.includes("image") ? " o imagen" : ""}</span>
      </span>
    </label>
  );
}

export function DppDeclarationWorkspace() {
  const [period, setPeriod] = useState("2026-06");
  const [indexedIncome, setIndexedIncome] = useState("220");
  const [exchangeRate, setExchangeRate] = useState("679.66036");
  const [included, setIncluded] = useState(() => new Set(employees.map((employee) => employee.id)));
  const [declaredBase, setDeclaredBase] = useState("598101.12");
  const [declaredTax, setDeclaredTax] = useState("53829.10");
  const [files, setFiles] = useState<Record<AttachmentId, File | null>>({
    declaration: null,
    certificate: null,
    paymentForm: null,
    transfer: null,
  });
  const [reviewed, setReviewed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  const income = parseDecimal(indexedIncome);
  const bcv = parseDecimal(exchangeRate);
  const safeIncome = Number.isFinite(income) ? income : 0;
  const safeBcv = Number.isFinite(bcv) ? bcv : 0;
  const selectedEmployees = employees.filter((employee) => included.has(employee.id));
  const rows = useMemo(
    () =>
      employees.map((employee) => {
        const base = safeIncome * safeBcv;
        return { ...employee, base, tax: base * 0.09 };
      }),
    [safeBcv, safeIncome],
  );
  const totalBase = selectedEmployees.length * safeIncome * safeBcv;
  const totalTax = totalBase * 0.09;
  const declarationBase = parseDecimal(declaredBase);
  const declarationTax = parseDecimal(declaredTax);
  const hasDeclarationValues = Number.isFinite(declarationBase) && Number.isFinite(declarationTax);
  const baseDifference = hasDeclarationValues ? declarationBase - totalBase : 0;
  const taxDifference = hasDeclarationValues ? declarationTax - totalTax : 0;
  const matched = hasDeclarationValues && Math.abs(baseDifference) < 0.02 && Math.abs(taxDifference) < 0.02;
  const attachedCount = Object.values(files).filter(Boolean).length;
  const expedienteComplete = attachedCount === attachments.length;
  const canReview = matched && expedienteComplete && selectedEmployees.length > 0;
  const [year, month] = period.split("-").map(Number);
  const periodDate = new Date(year, month - 1, 1);
  const periodLabel = new Intl.DateTimeFormat("es-VE", { month: "long", year: "numeric" }).format(periodDate);
  const closingDate = new Date(year, month, 0);

  const toggleEmployee = (id: string) => {
    setIncluded((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setReviewed(false);
    setSaved(false);
  };

  const updateFile = (id: AttachmentId, file: File | null) => {
    setFiles((current) => ({ ...current, [id]: file }));
    setReviewed(false);
    setSaved(false);
  };

  const generateWorkbook = async () => {
    setExporting(true);
    try {
      const { createDppWorkbookBlob } = await import("@/lib/dpp-workbook");
      const monthName = periodLabel.toUpperCase();
      const workbook = createDppWorkbookBlob({
        closingDateLabel: dateVe.format(closingDate),
        companyName: "Nueva Confitería del Sur, C.A.",
        companyRif: "J-30995144-0",
        employees: selectedEmployees,
        indexedIncome: safeIncome,
        periodLabel: monthName,
        rate: safeBcv,
      });
      const url = URL.createObjectURL(workbook);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `DPP_${period}_${selectedEmployees.length}_empleados.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } finally {
      setExporting(false);
    }
  };

  const printRelationship = () => {
    const printableRows = selectedEmployees
      .map((employee, index) => {
        const base = safeIncome * safeBcv;
        return `<tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(employee.identity)}</td>
          <td class="name">${escapeHtml(employee.name.toUpperCase())}</td>
          <td>${dateVe.format(new Date(`${employee.startedAt}T00:00:00`))}</td>
          <td>${dollars(safeIncome)}</td>
          <td>${rateVe.format(safeBcv)}</td>
          <td>${bolivars(base)}</td>
          <td>${bolivars(base)}</td>
          <td>9 %</td>
          <td>${bolivars(base * 0.09)}</td>
        </tr>`;
      })
      .join("");
    const report = window.open("", "_blank");
    if (!report) return;
    report.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Relación DPP ${escapeHtml(periodLabel)}</title><style>
      @page { size: landscape; margin: 12mm; }
      body { color: #1c1917; font-family: Arial, sans-serif; font-size: 10px; margin: 0; }
      h1, p { margin: 0 0 5px; }
      h1 { font-size: 15px; }
      .title { margin-bottom: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #57534e; padding: 7px 6px; text-align: right; vertical-align: middle; }
      th { background: #d6d3d1; font-weight: 700; text-align: center; }
      td:nth-child(1), td:nth-child(2), td:nth-child(4) { text-align: center; }
      td.name { text-align: left; }
      tfoot td { border-left: 0; border-right: 0; font-size: 12px; font-weight: 700; }
      .source { color: #78716c; font-size: 9px; margin-top: 14px; }
    </style></head><body>
      <div class="title"><h1>NUEVA CONFITERIA DEL SUR, C.A.</h1><p>J-30995144-0</p><p><strong>CALCULO CONTRIBUCION ESPECIAL LEY DE PENSIONES DE SEGURIDAD SOCIAL</strong></p><p>${escapeHtml(periodLabel.toUpperCase())}</p></div>
      <table><thead><tr><th>Nro.</th><th>RIF</th><th>Nombre y Apellido</th><th>Fecha de ingreso</th><th>Ingreso indexado USD</th><th>Tasa BCV</th><th>Monto en Bs.</th><th>Base imponible</th><th>Alícuota</th><th>Monto a pagar</th></tr></thead>
      <tbody>${printableRows}</tbody><tfoot><tr><td colspan="9">Total a pagar</td><td>${bolivars(totalTax)}</td></tr></tfoot></table>
      <p class="source">Relación preparada en proyectoxyz. Valores configurados para el período; validar fuente normativa, vigencia y tasa antes de presentar.</p>
      <script>window.addEventListener("load", () => window.print());<\/script>
    </body></html>`);
    report.document.close();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-5 border-b border-stone-200 pb-6 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-[#14352d] dark:hover:text-emerald-200" href="/declaraciones">
            <ArrowLeft size={15} /> Declaraciones
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <p className="text-sm text-stone-500">Declaraciones / Pensiones</p>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${reviewed ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300" : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"}`}>
              {reviewed ? "Listo para revisión" : "Borrador en preparación"}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">DPP · Protección a las pensiones</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Nueva Confitería del Sur, C.A. <span className="mx-1 text-stone-300">·</span> RIF J-30995144-0
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium shadow-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
            onClick={() => setSaved(true)}
            type="button"
          >
            <Save size={16} /> Guardar borrador
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white shadow-sm hover:bg-[#0e2821] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canReview}
            onClick={() => setReviewed(true)}
            type="button"
          >
            <Check size={16} /> Marcar listo para revisión
          </button>
        </div>
      </div>
      {saved && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          Borrador preparado en esta sesión. La persistencia y el almacenamiento documental requieren el backend.
        </p>
      )}
      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><Landmark size={18} /></div>
            <div>
              <h2 className="font-semibold">Parámetros del período</h2>
              <p className="mt-1 text-sm leading-5 text-stone-500">El ingreso indexado y la tasa deben conservar fuente, vigencia y responsable de verificación.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium">
              Período
              <SimpleSelect className="field mt-1.5" onChange={(event) => setPeriod(event.target.value)} value={period}>
                <option value="2026-05">Mayo 2026</option>
                <option value="2026-06">Junio 2026</option>
                <option value="2026-07">Julio 2026</option>
              </SimpleSelect>
            </label>
            <label className="text-sm font-medium">
              Ingreso mínimo indexado (USD)
              <Input className="field mt-1.5 text-right tabular-nums" inputMode="decimal" onChange={(event) => { setIndexedIncome(event.target.value); setReviewed(false); }} value={indexedIncome} />
              <span className="mt-1.5 block text-[11px] font-normal text-amber-700 dark:text-amber-300">Configurado en $220 · fuente pendiente</span>
            </label>
            <label className="text-sm font-medium">
              Tasa BCV al cierre
              <Input className="field mt-1.5 text-right tabular-nums" inputMode="decimal" onChange={(event) => { setExchangeRate(event.target.value); setReviewed(false); }} value={exchangeRate} />
              <span className="mt-1.5 block text-[11px] font-normal text-stone-500">Cierre {dateVe.format(closingDate)} · sin conexión BCV</span>
            </label>
            <div>
              <p className="text-sm font-medium">Alícuota</p>
              <div className="mt-1.5 flex h-9 items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm dark:border-stone-700 dark:bg-stone-800">
                <span>Contribución DPP</span><strong>9 %</strong>
              </div>
              <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">Reproducida del soporte · fuente pendiente</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="font-semibold">Configuración por formalizar</p>
              <p className="mt-1 leading-5">La muestra concilia con los documentos adjuntos de junio. Antes de automatizar, falta registrar la fuente normativa y conectar la tasa verificada del período.</p>
            </div>
          </div>
        </div>
      </section>
      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2"><Users size={18} className="text-[#14352d] dark:text-emerald-200" /><h2 className="font-semibold">Empleados del período</h2></div>
                <p className="mt-1 text-sm text-stone-500">La nómina es demostrativa y luego provendrá del módulo de empleados.</p>
              </div>
              <p className="text-sm text-stone-500">{selectedEmployees.length} de {employees.length} incluidos</p>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[940px] text-left text-sm">
                <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70">
                  <TableRow>
                    <TableHead className="w-11 px-4 py-3" />
                    <TableHead className="px-3 py-3">Empleado</TableHead>
                    <TableHead className="px-3 py-3 text-right">Ingreso indexado</TableHead>
                    <TableHead className="px-3 py-3 text-right">Tasa BCV</TableHead>
                    <TableHead className="px-3 py-3 text-right">Base imponible</TableHead>
                    <TableHead className="px-3 py-3 text-right">9 %</TableHead>
                    <TableHead className="w-12 px-4 py-3" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {rows.map((row) => (
                    <TableRow className={included.has(row.id) ? "" : "opacity-45"} key={row.id}>
                      <TableCell className="px-4 py-4">
                        <input aria-label={`Incluir ${row.name}`} checked={included.has(row.id)} className="size-4 accent-[#14352d]" onChange={() => toggleEmployee(row.id)} type="checkbox" />
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        <p className="font-medium">{row.name}</p>
                        <p className="mt-1 text-xs text-stone-500">{row.identity} · Ingreso {dateVe.format(new Date(`${row.startedAt}T00:00:00`))}</p>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-right font-medium tabular-nums">{dollars(safeIncome)}</TableCell>
                      <TableCell className="px-3 py-4 text-right tabular-nums">{rateVe.format(safeBcv)}</TableCell>
                      <TableCell className="px-3 py-4 text-right font-medium tabular-nums">{bolivars(row.base)}</TableCell>
                      <TableCell className="px-3 py-4 text-right font-semibold tabular-nums text-[#14352d] dark:text-emerald-200">{bolivars(row.tax)}</TableCell>
                      <TableCell className="px-4 py-4"><FileCheck2 className="text-stone-300" size={17} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="border-t border-stone-200 bg-stone-50/70 dark:border-stone-800 dark:bg-stone-800/50">
                  <TableRow>
                    <TableCell className="px-5 py-4" colSpan={4}>
                      <p className="font-semibold">Totales del período</p>
                      <p className="mt-1 text-xs text-stone-500">Base de {selectedEmployees.length} empleados seleccionados.</p>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-right text-base font-semibold tabular-nums">{bolivars(totalBase)}</TableCell>
                    <TableCell className="px-3 py-4 text-right text-lg font-semibold tabular-nums text-[#14352d] dark:text-emerald-200">{bolivars(totalTax)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><Upload size={18} /></div>
                <div>
                  <h2 className="font-semibold">Soportes del expediente</h2>
                  <p className="mt-1 text-sm text-stone-500">Arrastra cada documento a su casilla. Los archivos deben quedar privados, por empresa y con auditoría.</p>
                </div>
              </div>
              <span className="text-sm font-medium text-stone-500">{attachedCount} de {attachments.length}</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {attachments.map((definition) => (
                <AttachmentDropzone
                  definition={definition}
                  file={files[definition.id]}
                  key={definition.id}
                  onChange={(file) => updateFile(definition.id, file)}
                />
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-500">Prototipo: la interfaz retiene únicamente el nombre del archivo durante esta sesión; aún no carga ni guarda documentos en almacenamiento persistente.</p>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><FileSpreadsheet size={18} /></div>
              <div><h2 className="font-semibold">Relación de cálculo</h2><p className="mt-1 text-sm text-stone-500">Mismo orden de columnas del libro suministrado.</p></div>
            </div>
            <div className="mt-5 space-y-2">
              <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white hover:bg-[#0e2821] disabled:opacity-50" disabled={exporting || selectedEmployees.length === 0} onClick={generateWorkbook} type="button">
                <Download size={16} /> {exporting ? "Preparando Excel…" : "Descargar Excel"}
              </button>
              <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-stone-200 px-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800" disabled={selectedEmployees.length === 0} onClick={printRelationship} type="button">
                <Printer size={16} /> Imprimir o guardar PDF
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-stone-500">El Excel conserva fórmulas de conversión, base, 9 % y total para facilitar la revisión.</p>
          </section>

          <section className={`rounded-xl border p-5 shadow-sm ${hasDeclarationValues && !matched ? "border-rose-200 bg-rose-50/70 text-rose-950 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-100" : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"}`}>
            <div className="flex items-start gap-3">
              {matched ? <CheckCircle2 className="mt-0.5 text-emerald-600" size={19} /> : <ShieldCheck className="mt-0.5 text-[#14352d] dark:text-emerald-200" size={19} />}
              <div><h2 className="font-semibold">Verificación</h2><p className="mt-1 text-sm leading-5 text-stone-500 dark:text-stone-300">Compara el cálculo con la Forma 99019.</p></div>
            </div>
            <label className="mt-5 block text-sm font-medium">
              Base imponible declarada
              <Input className="field mt-1.5 text-right tabular-nums" inputMode="decimal" onChange={(event) => { setDeclaredBase(event.target.value); setReviewed(false); }} value={declaredBase} />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Impuesto declarado
              <Input className="field mt-1.5 text-right tabular-nums" inputMode="decimal" onChange={(event) => { setDeclaredTax(event.target.value); setReviewed(false); }} value={declaredTax} />
            </label>
            <div className="mt-5 space-y-3 border-t border-current/10 pt-4">
              <p className="flex justify-between text-sm text-stone-500 dark:text-stone-300"><span>Diferencia base</span><span className="tabular-nums">{bolivars(baseDifference)}</span></p>
              <p className="flex justify-between font-semibold"><span>Diferencia impuesto</span><span className="tabular-nums">{bolivars(taxDifference)}</span></p>
            </div>
            <p className={`mt-5 rounded-lg px-3 py-2 text-xs font-medium ${matched ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"}`}>
              {matched ? "La Forma 99019 coincide con el cálculo del período." : "Revisa la tasa, empleados y valores declarados antes de continuar."}
            </p>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 text-sm shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex gap-3">
              <FileText className="mt-0.5 text-[#14352d] dark:text-emerald-200" size={18} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Control del expediente</p>
                <div className="mt-3 space-y-2 text-stone-600 dark:text-stone-300">
                  <ControlItem complete={selectedEmployees.length > 0} text={`${selectedEmployees.length} empleados incluidos`} />
                  <ControlItem complete={matched} text="Cálculo conciliado" />
                  <ControlItem complete={expedienteComplete} text={`${attachedCount} de ${attachments.length} soportes`} />
                  <ControlItem complete={reviewed} text="Revisión interna" />
                </div>
              </div>
            </div>
            {!canReview && <p className="mt-4 text-xs leading-5 text-stone-500">Para enviar a revisión, el cálculo debe coincidir y los cuatro soportes deben estar adjuntos.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function ControlItem({ complete, text }: { complete: boolean; text: string }) {
  return (
    <p className="flex items-center gap-2">
      {complete ? <CheckCircle2 className="shrink-0 text-emerald-600" size={16} /> : <span className="size-4 shrink-0 rounded-full border border-stone-300 dark:border-stone-600" />}
      {text}
    </p>
  );
}
