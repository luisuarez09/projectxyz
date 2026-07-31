"use client";;
import {
  Archive,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileOutput,
  FileText,
  History,
  Info,
  ListChecks,
  Printer,
  RotateCcw,
  Search,
  Tags,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

type Tab = "consolidado" | "etiqueta" | "historial";
type DocumentStatus = "available" | "missing";
type ArchiveDocument = { id: string; name: string; detail: string; pages: number; status: DocumentStatus; selected: boolean };
type DocumentGroup = { id: string; name: string; cadence: string; color: string; documents: ArchiveDocument[] };

const initialGroups: DocumentGroup[] = [
  { id: "iva", name: "IVA", cadence: "Mensual", color: "bg-emerald-500", documents: [
    { id: "iva-declaracion", name: "Declaración definitiva", detail: "Forma 99030 · Junio 2026", pages: 2, status: "available", selected: true },
    { id: "iva-planilla", name: "Planilla de pago", detail: "Período 06/2026", pages: 1, status: "available", selected: true },
    { id: "iva-transferencia", name: "Comprobante de transferencia", detail: "Pago registrado el 18 jul 2026", pages: 1, status: "available", selected: true },
    { id: "iva-libros", name: "Libros de compras y ventas", detail: "Cierre del período", pages: 8, status: "available", selected: true },
  ]},
  { id: "ivss", name: "IVSS", cadence: "Mensual", color: "bg-sky-500", documents: [
    { id: "ivss-factura", name: "Factura del período", detail: "Número 2026-06-1842", pages: 1, status: "available", selected: true },
    { id: "ivss-planilla", name: "Planilla de pago", detail: "Período Junio 2026", pages: 2, status: "available", selected: true },
    { id: "ivss-solvencia", name: "Solvencia vigente", detail: "Adjunto verificado", pages: 1, status: "available", selected: true },
    { id: "ivss-transferencia", name: "Comprobante bancario", detail: "Sin archivo adjunto", pages: 0, status: "missing", selected: false },
  ]},
  { id: "faov", name: "FAOV", cadence: "Mensual", color: "bg-violet-500", documents: [
    { id: "faov-planilla", name: "Planilla de aportes", detail: "Período Junio 2026", pages: 2, status: "available", selected: true },
    { id: "faov-pago", name: "Comprobante de pago", detail: "Pago registrado el 15 jul 2026", pages: 1, status: "available", selected: true },
  ]},
  { id: "inces", name: "INCES", cadence: "Trimestral", color: "bg-amber-500", documents: [
    { id: "inces-declaracion", name: "Declaración trimestral", detail: "2do trimestre 2026", pages: 2, status: "available", selected: true },
    { id: "inces-pago", name: "Comprobante de pago", detail: "Sin archivo adjunto", pages: 0, status: "missing", selected: false },
  ]},
  { id: "municipal", name: "Actividades económicas", cadence: "Mensual · Casa matriz", color: "bg-rose-500", documents: [
    { id: "municipal-declaracion", name: "Declaración municipal", detail: "Período Junio 2026", pages: 2, status: "available", selected: true },
    { id: "municipal-pago", name: "Recibo de pago", detail: "Alcaldía · comprobante adjunto", pages: 1, status: "available", selected: true },
  ]},
  { id: "servicios", name: "Servicios y compromisos", cadence: "Según cobertura", color: "bg-stone-500", documents: [
    { id: "servicio-electricidad", name: "Electricidad", detail: "Factura y comprobante de pago", pages: 2, status: "available", selected: true },
    { id: "servicio-aseo", name: "Aseo urbano", detail: "Recibo del período", pages: 1, status: "available", selected: true },
    { id: "servicio-condominio", name: "Condominio", detail: "Sin archivo adjunto", pages: 0, status: "missing", selected: false },
  ]},
];

const historyRows = [
  { period: "Mayo 2026", generated: "12 jun 2026 · 10:14 a. m.", contents: "IVA, IVSS, FAOV y servicios", pages: 24, status: "Entregada" },
  { period: "Abril 2026", generated: "14 may 2026 · 4:32 p. m.", contents: "IVA, IVSS, FAOV y servicios", pages: 21, status: "Entregada" },
  { period: "Marzo 2026", generated: "16 abr 2026 · 9:20 a. m.", contents: "IVA, IVSS, INCES y municipales", pages: 28, status: "Generada" },
  { period: "Febrero 2026", generated: "13 mar 2026 · 2:08 p. m.", contents: "IVA, IVSS y FAOV", pages: 19, status: "Entregada" },
];

export function ArchiveBuilder() {
  const [tab, setTab] = useState<Tab>("consolidado");
  const [groups, setGroups] = useState(initialGroups);
  const [period, setPeriod] = useState("Junio 2026");
  const [company, setCompany] = useState("Distribuidora El Roble, C.A.");
  const [search, setSearch] = useState("");
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [printMode, setPrintMode] = useState<"consolidado" | "etiqueta">("consolidado");
  const [printGroupId, setPrintGroupId] = useState<string | null>(null);
  const [title, setTitle] = useState("ARCHIVO TRIBUTARIO Y DE SERVICIOS");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState("");

  const selectedDocuments = useMemo(() => groups.flatMap((group) => group.documents.filter((document) => document.selected).map((document) => ({ ...document, group: group.name, groupId: group.id }))), [groups]);
  const selectedGroups = useMemo(() => groups.filter((group) => group.documents.some((document) => document.selected)), [groups]);
  const allAvailableSelected = groups.every((group) => group.documents.filter((document) => document.status === "available").every((document) => document.selected));
  const documentsForPrint = printGroupId ? selectedDocuments.filter((document) => document.groupId === printGroupId) : selectedDocuments;
  const totalPages = 2 + selectedDocuments.reduce((total, document) => total + document.pages, 0);
  const missingCount = groups.flatMap((group) => group.documents).filter((document) => document.status === "missing").length;
  const labelDescription = description || selectedGroups.map((group) => group.name).join(" · ") || "Sin contenido seleccionado";

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  function toggleDocument(groupId: string, documentId: string) {
    setGroups((current) => current.map((group) => group.id !== groupId ? group : { ...group, documents: group.documents.map((document) => document.id !== documentId || document.status === "missing" ? document : { ...document, selected: !document.selected }) }));
  }

  function toggleGroup(groupId: string) {
    setGroups((current) => current.map((group) => {
      if (group.id !== groupId) return group;
      const available = group.documents.filter((document) => document.status === "available");
      const allSelected = available.length > 0 && available.every((document) => document.selected);
      return { ...group, documents: group.documents.map((document) => document.status === "missing" ? document : { ...document, selected: !allSelected }) };
    }));
  }

  function toggleAll() {
    setGroups((current) => current.map((group) => ({ ...group, documents: group.documents.map((document) => document.status === "missing" ? document : { ...document, selected: !allAvailableSelected }) })));
  }

  function print(mode: "consolidado" | "etiqueta", groupId: string | null = null) {
    setPrintMode(mode);
    setPrintGroupId(groupId);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }

  function loadPrevious(periodToLoad: string) {
    setPeriod(periodToLoad);
    setTab("consolidado");
    showNotice(`Se cargó la selección archivada de ${periodToLoad} para reimpresión.`);
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10">
      {notice && <div className="fixed right-4 top-22 z-50 max-w-sm rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-xl dark:border-emerald-900 dark:bg-stone-900 dark:text-stone-200">{notice}</div>}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2"><p className="text-sm text-stone-500">Entregables de la firma</p><Badge className="border-stone-200 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300" variant="outline">Documentos demostrativos</Badge></div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Archivo físico</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">Consolida las evidencias del período, revisa el expediente y prepara la carpeta que se entrega al contribuyente.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <span className="sr-only">Empresa</span><Building2 className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} />
            <SimpleSelect className="field min-w-64 pl-9" onChange={(event) => setCompany(event.target.value)} value={company}><option>Distribuidora El Roble, C.A.</option><option>Inversiones Costa Azul, C.A.</option><option>Servicios Maracay, C.A.</option></SimpleSelect>
          </label>
          <label className="relative">
            <span className="sr-only">Período de imposición</span><CalendarDays className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} />
            <SimpleSelect className="field min-w-44 pl-9" onChange={(event) => setPeriod(event.target.value)} value={period}><option>Junio 2026</option><option>Mayo 2026</option><option>Abril 2026</option><option>Marzo 2026</option><option>Febrero 2026</option></SimpleSelect>
          </label>
        </div>
      </div>
      <nav className="mt-7 flex gap-6 overflow-x-auto border-b border-stone-200 text-sm dark:border-stone-800" aria-label="Secciones de archivo">
        <TabButton active={tab === "consolidado"} icon={Archive} label="Consolidado mensual" onClick={() => setTab("consolidado")} />
        <TabButton active={tab === "etiqueta"} icon={Tags} label="Etiqueta de portada" onClick={() => setTab("etiqueta")} />
        <TabButton active={tab === "historial"} icon={History} label="Historial y reimpresión" onClick={() => setTab("historial")} />
      </nav>
      {tab === "consolidado" && <>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="Documentos incluidos" value={String(selectedDocuments.length)} detail={`De ${groups.flatMap((group) => group.documents).filter((document) => document.status === "available").length} disponibles`} icon={ListChecks} tone="emerald" />
          <Summary label="Páginas estimadas" value={String(totalPages)} detail="Incluye portada e índice" icon={FileText} tone="blue" />
          <Summary label="Secciones" value={String(selectedGroups.length)} detail="Tributos y servicios marcados" icon={Archive} tone="stone" />
          <Summary label="Adjuntos faltantes" value={String(missingCount)} detail="No se incluirán en la salida" icon={TriangleAlert} tone="amber" />
        </div>

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(440px,0.88fr)]">
          <div className="space-y-4">
            <Card className="border-0 shadow-sm"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} /><Input className="field pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar declaración, solvencia, planilla o comprobante..." value={search} /></div><Button className="shrink-0" onClick={toggleAll} variant="outline">{allAvailableSelected ? <><span className="size-3.5 rounded-sm border border-stone-400" /> Desmarcar todos</> : <><Check size={15} /> Marcar todos</>}</Button></CardContent></Card>
            {groups.filter((group) => `${group.name} ${group.documents.map((document) => `${document.name} ${document.detail}`).join(" ")}`.toLowerCase().includes(search.toLowerCase())).map((group) => <DocumentGroupCard group={group} key={group.id} onPrintGroup={(groupId) => print("consolidado", groupId)} onToggleDocument={toggleDocument} onToggleGroup={toggleGroup} />)}
            <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100"><Info className="mt-0.5 shrink-0" size={18} /><p className="leading-6"><strong>Orden del expediente:</strong> portada, índice y luego documentos agrupados por obligación. Los adjuntos faltantes quedan señalados para completar la carpeta antes de imprimir.</p></div>
          </div>

          <PreviewPanel company={company} expanded={previewExpanded} labelDescription={labelDescription} onClose={() => setPreviewExpanded(false)} onExpand={() => setPreviewExpanded(true)} onPrint={() => print("consolidado")} period={period} selectedDocuments={selectedDocuments} totalPages={totalPages} />
        </div>
      </>}
      {tab === "etiqueta" && <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(440px,1.08fr)]">
        <Card className="border-0 shadow-sm"><CardContent className="p-5 sm:p-6"><div><h2 className="text-lg font-semibold">Datos de la etiqueta</h2><p className="mt-1 text-sm text-stone-500">Diseñada para imprimirse y adherirse al frente de la carpeta física.</p></div><div className="mt-6 grid gap-4"><label className="text-sm font-medium">Nombre legal<Input className="field mt-1.5" readOnly value={company} /></label><label className="text-sm font-medium">RIF<Input className="field mt-1.5" readOnly value="J-403808880" /></label><label className="text-sm font-medium">Título de la carpeta<Input className="field mt-1.5" maxLength={64} onChange={(event) => setTitle(event.target.value)} value={title} /></label><label className="text-sm font-medium">Descripción<textarea className="field mt-1.5 min-h-28 py-2" onChange={(event) => setDescription(event.target.value)} placeholder={selectedGroups.map((group) => group.name).join(" · ")} value={description} /></label><label className="text-sm font-medium">Período de imposición<Input className="field mt-1.5" readOnly value={period} /></label></div><div className="mt-5 flex gap-3 rounded-xl bg-stone-50 p-4 text-xs leading-5 text-stone-600 dark:bg-stone-800 dark:text-stone-300"><Tags className="mt-0.5 shrink-0" size={17} /><p>La descripción se completa automáticamente con las secciones seleccionadas. Puedes ajustarla sin cambiar el contenido del PDF consolidado.</p></div></CardContent></Card>
        <LabelPreview company={company} description={labelDescription} onPrint={() => print("etiqueta")} period={period} title={title} />
      </div>}
      {tab === "historial" && <HistoryView company={company} onLoad={loadPrevious} />}
      <div className="hidden" id="archive-print-root" data-print-mode={printMode}>
        <div className="archive-consolidated-preview"><PrintableArchive company={company} period={period} selectedDocuments={documentsForPrint} totalPages={2 + documentsForPrint.reduce((total, document) => total + document.pages, 0)} /></div>
        <div className="archive-label-preview"><PrintableLabel company={company} description={labelDescription} period={period} title={title} /></div>
      </div>
    </div>
  );
}

function DocumentGroupCard({ group, onPrintGroup, onToggleDocument, onToggleGroup }: { group: DocumentGroup; onPrintGroup: (groupId: string) => void; onToggleDocument: (groupId: string, documentId: string) => void; onToggleGroup: (groupId: string) => void }) {
  const available = group.documents.filter((document) => document.status === "available");
  const selected = available.filter((document) => document.selected);
  const allSelected = available.length > 0 && selected.length === available.length;
  return <details className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden"><button aria-label={`${allSelected ? "Desmarcar" : "Marcar"} todos los documentos de ${group.name}`} className={`grid size-5 shrink-0 place-items-center rounded border ${allSelected ? "border-[#14352d] bg-[#14352d] text-white" : selected.length ? "border-[#14352d] bg-emerald-50 text-[#14352d]" : "border-stone-300 dark:border-stone-600"}`} onClick={(event) => { event.preventDefault(); onToggleGroup(group.id); }} type="button">{allSelected ? <Check size={13} /> : selected.length ? <span className="h-0.5 w-2.5 bg-current" /> : null}</button><span className={`size-2.5 rounded-full ${group.color}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{group.name}</h2><span className="text-xs text-stone-400">{group.cadence}</span></div><p className="mt-0.5 text-xs text-stone-500">{selected.length} de {available.length} documentos incluidos</p></div><Button disabled={selected.length === 0} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onPrintGroup(group.id); }} size="sm" variant="outline"><Printer size={14} /> <span className="hidden sm:inline">Imprimir PDF</span></Button><ChevronDown className="text-stone-400 transition-transform group-open:rotate-180" size={17} /></summary><div className="border-t border-stone-100 px-4 dark:border-stone-800">{group.documents.map((document) => <label className={`flex items-start gap-3 border-b border-stone-100 py-3.5 last:border-0 dark:border-stone-800 ${document.status === "missing" ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`} key={document.id}><input checked={document.selected} className="sr-only" disabled={document.status === "missing"} onChange={() => onToggleDocument(group.id, document.id)} type="checkbox" /><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border ${document.selected ? "border-[#14352d] bg-[#14352d] text-white" : "border-stone-300 dark:border-stone-600"}`}>{document.selected && <Check size={13} />}</span><FileText className="mt-0.5 shrink-0 text-stone-400" size={17} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{document.name}</span><span className="mt-0.5 block text-xs text-stone-500">{document.detail}</span></span>{document.status === "missing" ? <Badge className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300" variant="outline">Falta adjunto</Badge> : <span className="shrink-0 text-xs text-stone-400">{document.pages} pág.</span>}</label>)}</div></details>;
}

type SelectedDocument = ArchiveDocument & { group: string; groupId: string };

function PreviewPanel({ company, expanded, labelDescription, onClose, onExpand, onPrint, period, selectedDocuments, totalPages }: { company: string; expanded: boolean; labelDescription: string; onClose: () => void; onExpand: () => void; onPrint: () => void; period: string; selectedDocuments: SelectedDocument[]; totalPages: number }) {
  return <aside className={`${expanded ? "fixed inset-0 z-50 overflow-y-auto bg-stone-100 p-4 dark:bg-stone-950 sm:p-8" : "sticky top-24"} `}><Card className={`overflow-hidden border-0 shadow-sm ${expanded ? "mx-auto max-w-5xl" : ""}`}><div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 dark:border-stone-800"><div><h2 className="font-semibold">Vista preliminar</h2><p className="mt-0.5 text-xs text-stone-500">{totalPages} páginas estimadas · tamaño carta</p></div><div className="flex items-center gap-1"><Button onClick={expanded ? onClose : onExpand} size="sm" variant="ghost"><Eye size={15} /> {expanded ? "Cerrar" : "Ampliar"}</Button><Button className="bg-[#14352d] hover:bg-[#0e2821]" disabled={selectedDocuments.length === 0} onClick={onPrint} size="sm"><Printer size={15} /> Imprimir / PDF</Button></div></div><div className={`overflow-y-auto bg-stone-200/70 p-4 dark:bg-stone-950 ${expanded ? "max-h-none" : "max-h-[780px]"}`}><div className={`mx-auto ${expanded ? "max-w-3xl" : "max-w-xl"} space-y-4`}><PreviewCover company={company} description={labelDescription} period={period} /><PreviewIndex documents={selectedDocuments} />{selectedDocuments.map((document, index) => <PreviewDocument document={document} index={index + 3} key={document.id} totalPages={totalPages} />)}{selectedDocuments.length === 0 && <div className="grid min-h-96 place-items-center rounded bg-white p-8 text-center text-sm text-stone-500 shadow-sm">Selecciona al menos un documento para construir la vista preliminar.</div>}</div></div></Card></aside>;
}

function PreviewCover({ company, description, period }: { company: string; description: string; period: string }) {
  return <div className="aspect-[8.5/11] bg-white p-[8%] text-stone-900 shadow-sm"><div className="flex h-full flex-col border-[3px] border-[#14352d] p-[8%]"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[#14352d] text-sm font-bold text-white">PX</span><div><p className="text-sm font-bold">proyectoxyz</p><p className="text-[10px] uppercase tracking-widest text-stone-500">Firma contable</p></div></div><div className="my-auto"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f715f]">Expediente mensual</p><h3 className="mt-4 text-3xl font-bold leading-tight">{company}</h3><p className="mt-3 text-sm font-medium">RIF J-403808880</p><div className="my-8 h-px bg-stone-200" /><p className="text-2xl font-semibold">{period}</p><p className="mt-5 text-sm leading-6 text-stone-600">{description}</p></div><div className="flex items-end justify-between border-t border-stone-200 pt-5 text-[10px] text-stone-500"><span>Archivo tributario y de servicios</span><span>Página 1</span></div></div></div>;
}

function PreviewIndex({ documents }: { documents: SelectedDocument[] }) {
  let page = 3;
  return <div className="aspect-[8.5/11] bg-white p-[8%] text-stone-900 shadow-sm"><h3 className="text-2xl font-bold">Índice del expediente</h3><p className="mt-2 text-sm text-stone-500">Documentos incluidos en el orden de impresión</p><div className="mt-8 space-y-3">{documents.map((document, index) => { const start = page; page += document.pages; return <div className="flex items-start gap-3 border-b border-stone-100 pb-3" key={document.id}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-stone-100 text-xs font-semibold">{index + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{document.group} · {document.name}</p><p className="mt-0.5 text-xs text-stone-500">{document.detail}</p></div><span className="text-xs font-medium text-stone-500">{start}</span></div>; })}</div><p className="mt-8 rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-500">El orden responde a la selección actual. Antes de imprimir, confirma que cada archivo esté legible y corresponda al período.</p></div>;
}

function PreviewDocument({ document, index, totalPages }: { document: SelectedDocument; index: number; totalPages: number }) {
  return <div className="aspect-[8.5/11] bg-white p-[8%] text-stone-900 shadow-sm"><div className="flex items-start justify-between border-b border-stone-200 pb-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#2f715f]">{document.group}</p><h3 className="mt-1 text-xl font-bold">{document.name}</h3></div><FileText className="text-stone-300" size={26} /></div><div className="mt-8 rounded-lg border border-stone-200 p-5"><p className="text-xs font-medium uppercase tracking-wider text-stone-400">Archivo adjunto</p><p className="mt-2 text-sm font-semibold">{document.name}.pdf</p><p className="mt-1 text-xs text-stone-500">{document.detail} · {document.pages} {document.pages === 1 ? "página" : "páginas"}</p></div><div className="mt-10 space-y-4 opacity-45">{[92, 76, 88, 65, 82, 54].map((width, line) => <div className="h-2 rounded bg-stone-200" key={line} style={{ width: `${width}%` }} />)}</div><div className="mt-12 grid grid-cols-2 gap-5 opacity-40"><div className="h-32 rounded border border-stone-200 bg-stone-50" /><div className="h-32 rounded border border-stone-200 bg-stone-50" /></div><div className="mt-auto flex justify-between border-t border-stone-200 pt-4 text-[10px] text-stone-500"><span>Documento incorporado al expediente</span><span>Página {index} de {totalPages}</span></div></div>;
}

function LabelPreview({ company, description, onPrint, period, title }: { company: string; description: string; onPrint: () => void; period: string; title: string }) {
  return <Card className="sticky top-24 overflow-hidden border-0 shadow-sm"><div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 dark:border-stone-800"><div><h2 className="font-semibold">Vista de la etiqueta</h2><p className="mt-0.5 text-xs text-stone-500">Formato carta · recorta por la guía</p></div><Button className="bg-[#14352d] hover:bg-[#0e2821]" onClick={onPrint} size="sm"><Printer size={15} /> Imprimir etiqueta</Button></div><div className="bg-stone-200/70 p-5 dark:bg-stone-950"><div className="mx-auto aspect-[8.5/11] max-w-2xl bg-white p-[8%] text-stone-900 shadow-sm"><div className="flex h-full flex-col border border-dashed border-stone-400 p-[8%]"><div className="flex items-center justify-between border-b-4 border-[#14352d] pb-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-lg bg-[#14352d] text-sm font-bold text-white">PX</span><div><p className="font-bold">proyectoxyz</p><p className="text-[10px] uppercase tracking-widest text-stone-500">Firma contable</p></div></div><span className="text-xs font-semibold uppercase text-[#2f715f]">Carpeta física</span></div><div className="my-auto text-center"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{title}</p><h3 className="mx-auto mt-6 max-w-xl text-3xl font-bold leading-tight">{company}</h3><p className="mt-3 text-lg font-semibold">RIF J-403808880</p><div className="mx-auto my-7 h-px max-w-md bg-stone-200" /><p className="text-2xl font-bold text-[#14352d]">{period}</p><p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-stone-600">{description}</p></div><div className="border-t border-stone-200 pt-4 text-center text-[10px] uppercase tracking-wider text-stone-400">Documentación entregada al contribuyente</div></div></div></div></Card>;
}

function HistoryView({ company, onLoad }: { company: string; onLoad: (period: string) => void }) {
  const [query, setQuery] = useState("");
  const rows = historyRows.filter((row) => `${row.period} ${row.contents} ${row.status}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="mt-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-semibold">Carpetas de períodos anteriores</h2><p className="mt-1 text-sm text-stone-500">{company} · consulta, revisa o prepara una reimpresión.</p></div><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} /><Input className="field pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar período o contenido..." value={query} /></div></div><Card className="mt-5 overflow-hidden border-0 shadow-sm"><div className="overflow-x-auto"><Table className="w-full min-w-[820px] text-left text-sm"><TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/60"><TableRow><TableHead className="px-5 py-3">Período</TableHead><TableHead className="px-5 py-3">Contenido</TableHead><TableHead className="px-5 py-3">Generada</TableHead><TableHead className="px-5 py-3">Páginas</TableHead><TableHead className="px-5 py-3">Estado</TableHead><TableHead className="px-5 py-3 text-right">Acción</TableHead></TableRow></TableHeader><TableBody className="divide-y divide-stone-100 dark:divide-stone-800">{rows.map((row) => <TableRow className="hover:bg-[#f4faf6] dark:hover:bg-emerald-950/10" key={row.period}><TableCell className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800"><Archive size={17} /></span><div><p className="font-semibold">{row.period}</p><p className="mt-0.5 text-xs text-stone-500">Expediente mensual</p></div></div></TableCell><TableCell className="px-5 py-4 text-stone-600 dark:text-stone-300">{row.contents}</TableCell><TableCell className="px-5 py-4 text-stone-500">{row.generated}</TableCell><TableCell className="px-5 py-4 font-medium">{row.pages}</TableCell><TableCell className="px-5 py-4"><Badge className={row.status === "Entregada" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"} variant="outline">{row.status}</Badge></TableCell><TableCell className="px-5 py-4 text-right"><Button onClick={() => onLoad(row.period)} size="sm" variant="outline"><RotateCcw size={15} /> Reimprimir</Button></TableCell></TableRow>)}</TableBody></Table></div>{rows.length === 0 && <p className="px-5 py-12 text-center text-sm text-stone-500">No se encontraron carpetas para esa búsqueda.</p>}</Card></div>;
}

function PrintableArchive({ company, period, selectedDocuments, totalPages }: { company: string; period: string; selectedDocuments: SelectedDocument[]; totalPages: number }) {
  return <>{<PreviewCover company={company} description={selectedDocuments.map((document) => document.group).filter((value, index, all) => all.indexOf(value) === index).join(" · ")} period={period} />}<PreviewIndex documents={selectedDocuments} />{selectedDocuments.map((document, index) => <PreviewDocument document={document} index={index + 3} key={document.id} totalPages={totalPages} />)}</>;
}

function PrintableLabel({ company, description, period, title }: { company: string; description: string; period: string; title: string }) {
  return <div className="archive-preview-page h-[11in] w-[8.5in] bg-white p-[0.65in] text-stone-900"><div className="flex h-full flex-col border border-dashed border-stone-400 p-[0.65in]"><div className="flex items-center justify-between border-b-4 border-[#14352d] pb-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-lg bg-[#14352d] text-sm font-bold text-white">PX</span><div><p className="font-bold">proyectoxyz</p><p className="text-[10px] uppercase tracking-widest text-stone-500">Firma contable</p></div></div><span className="text-xs font-semibold uppercase text-[#2f715f]">Carpeta física</span></div><div className="my-auto text-center"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{title}</p><h3 className="mt-6 text-3xl font-bold">{company}</h3><p className="mt-3 text-lg font-semibold">RIF J-403808880</p><div className="mx-auto my-7 h-px max-w-md bg-stone-200" /><p className="text-2xl font-bold text-[#14352d]">{period}</p><p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-stone-600">{description}</p></div><div className="border-t border-stone-200 pt-4 text-center text-[10px] uppercase tracking-wider text-stone-400">Documentación entregada al contribuyente</div></div></div>;
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Archive; label: string; onClick: () => void }) {
  return <button className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-1 pb-3 ${active ? "border-[#14352d] font-medium text-[#14352d] dark:border-emerald-300 dark:text-emerald-200" : "border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"}`} onClick={onClick} type="button"><Icon size={16} /> {label}</button>;
}

function Summary({ icon: Icon, label, value, detail, tone }: { icon: typeof Archive; label: string; value: string; detail: string; tone: "emerald" | "blue" | "stone" | "amber" }) {
  const colors = { emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300", blue: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300", stone: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300" };
  return <Card className="border-0 shadow-sm"><CardContent className="flex items-start justify-between pt-4"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div><span className={`grid size-9 place-items-center rounded-lg ${colors[tone]}`}><Icon size={18} /></span></CardContent></Card>;
}
