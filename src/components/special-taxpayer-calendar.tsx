"use client";

import { CalendarClock, Check, FileCheck2, FileUp, Pencil, Save } from "lucide-react";
import { useMemo, useState } from "react";

import { AttachmentInput } from "@/components/ui/attachment-input";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { speCalendarMatrices2026, speCalendarSource2026, type SpeCalendarMatrix } from "@/lib/spe-calendar-2026";

export function SpecialTaxpayerCalendar() {
  const [matrices, setMatrices] = useState<SpeCalendarMatrix[]>(() => structuredClone(speCalendarMatrices2026));
  const [selectedId, setSelectedId] = useState("a1-first-half");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fileName, setFileName] = useState("");
  const selected = matrices.find((matrix) => matrix.id === selectedId) ?? matrices[0];
  const totalDates = useMemo(() => matrices.reduce((total, matrix) => total + matrix.rows.reduce((rowTotal, row) => rowTotal + Object.values(row.dates).filter(Boolean).length, 0), 0), [matrices]);

  const updateDate = (rif: string, column: string, value: string) => {
    setSaved(false);
    setMatrices((current) => current.map((matrix) => matrix.id !== selected.id ? matrix : {
      ...matrix,
      rows: matrix.rows.map((row) => row.rif === rif ? { ...row, dates: { ...row.dates, [column]: value } } : row),
    }));
  };

  return <div className="space-y-5">
    <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/25 dark:text-violet-100">
      <div className="flex gap-3"><CalendarClock className="mt-0.5 shrink-0" size={19} /><div><p className="font-semibold">La regla SPE es adicional a la regla ordinaria</p><p className="mt-1 max-w-4xl leading-6">Una obligación conserva su vencimiento normal para contribuyentes ordinarios. Solo cuando la empresa está registrada como sujeto pasivo especial, el sistema busca la matriz asociada al tributo, identifica el terminal de su RIF y toma la fecha específica del período.</p></div></div>
    </section>

    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col gap-4 border-b border-stone-100 p-5 dark:border-stone-800 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><FileCheck2 size={19} /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Calendario SENIAT SPE 2026</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Referencia cargada</span></div><p className="mt-1 text-sm text-stone-500">{speCalendarSource2026.gazette} · {speCalendarSource2026.publishedAt} · Providencia {speCalendarSource2026.provision}</p><p className="mt-1 text-xs text-stone-400">{speCalendarSource2026.note}</p></div></div>
        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"><FileUp size={16} /> {fileName || "Adjuntar publicación"}<AttachmentInput accept="application/pdf,image/*" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></label>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <div className="rounded-lg bg-stone-50 p-3 dark:bg-stone-800"><p className="text-xs text-stone-500">Matrices cargadas</p><p className="mt-1 text-xl font-semibold">{matrices.length}</p></div>
        <div className="rounded-lg bg-stone-50 p-3 dark:bg-stone-800"><p className="text-xs text-stone-500">Fechas registradas</p><p className="mt-1 text-xl font-semibold">{totalDates}</p></div>
        <div className="rounded-lg bg-stone-50 p-3 dark:bg-stone-800"><p className="text-xs text-stone-500">Criterio de asignación</p><p className="mt-1 text-sm font-semibold">Tributo + período + terminal RIF</p></div>
      </div>
    </section>

    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col gap-4 border-b border-stone-100 p-5 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]"><label className="field-label">Año<SimpleSelect className="field mt-1.5" value="2026"><option>2026</option></SimpleSelect></label><label className="field-label">Matriz por obligación y período<SimpleSelect className="field mt-1.5" onChange={(event) => { setSelectedId(event.target.value); setEditing(false); setSaved(false); }} value={selectedId}>{matrices.map((matrix) => <option key={matrix.id} value={matrix.id}>{matrix.label} · {matrix.shortLabel}</option>)}</SimpleSelect></label></div>
        <div className="flex gap-2">{editing ? <><button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800" onClick={() => setEditing(false)} type="button">Cancelar</button><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white" onClick={() => { setEditing(false); setSaved(true); }} type="button"><Save size={16} /> Guardar matriz</button></> : <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800" onClick={() => setEditing(true)} type="button"><Pencil size={16} /> Editar fechas</button>}</div>
      </div>
      <div className="border-b border-stone-100 bg-stone-50/60 px-5 py-4 dark:border-stone-800 dark:bg-stone-800/30"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{selected.label}</h3><span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">{selected.cadence}</span></div><p className="mt-1 text-sm text-stone-500">{selected.period}</p></div><div className="flex flex-wrap gap-1.5">{selected.obligations.map((obligation) => <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300" key={obligation}>{obligation}</span>)}</div></div>{selected.note && <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-300">{selected.note}</p>}</div>
      <div className="overflow-x-auto"><Table className="min-w-[760px] w-full text-center text-sm"><TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="sticky left-0 z-10 min-w-24 bg-stone-50 px-4 py-3 text-left dark:bg-stone-800">Terminal RIF</TableHead>{selected.columns.map((column) => <TableHead className="min-w-14 px-2 py-3 text-center" key={column}>{column}</TableHead>)}</TableRow></TableHeader><TableBody className="divide-y divide-stone-100 dark:divide-stone-800">{selected.rows.map((row) => <TableRow key={row.rif}><TableCell className="sticky left-0 bg-white px-4 py-3 text-left font-semibold dark:bg-stone-900">{row.rif}</TableCell>{selected.columns.map((column) => <TableCell className="px-1.5 py-2" key={`${row.rif}-${column}`}>{editing ? <Input aria-label={`${selected.shortLabel}, RIF ${row.rif}, ${column}`} className="h-8 min-w-12 px-1 text-center text-xs tabular-nums" inputMode="numeric" onChange={(event) => updateDate(row.rif, column, event.target.value)} value={row.dates[column] ?? ""} /> : <span className="inline-grid min-h-8 min-w-10 place-items-center rounded-md bg-stone-50 px-2 font-medium tabular-nums dark:bg-stone-800">{row.dates[column] || "—"}</span>}</TableCell>)}</TableRow>)}</TableBody></Table></div>
      <div className="flex flex-col gap-2 border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"><span>El valor de cada celda es el día límite del mes correspondiente.</span>{saved && <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300"><Check size={14} /> Matriz guardada en esta vista</span>}</div>
    </section>
  </div>;
}
